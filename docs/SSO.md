# Single sign-on with Authentik, and gating with NetBird

Two independent layers. Use either one or both:

- **Authentik (who may sign in):** the dashboard gets a **Continue with Authentik** button. You can turn off email and password sign-in, and limit access to an Authentik group.
- **NetBird (who can reach the server at all):** the dashboard, and optionally the API, listen only on your NetBird network. Nobody else can even load the login page, and all traffic is encrypted end to end.

Any OpenID Connect provider works the same way (Keycloak, Zitadel, Pocket ID…). This guide uses Authentik's terms.

---

## Part 1: Authentik

### 1.1 What CrossHub needs from Authentik

| Setting | Value |
|---|---|
| Provider type | OAuth2/OpenID Provider |
| Client type | Confidential |
| Redirect URI | `<dashboard address>/api/auth/callback/oidc`, for example `http://imac.netbird.cloud:3000/api/auth/callback/oidc` |
| Scopes | `openid`, `email`, `profile` (Authentik's defaults) |
| Signing key | Any certificate, for example *authentik Self-signed Certificate* |

The dashboard address is your `NEXTAUTH_URL` from `web/.env`. Both must match exactly, including `http`/`https`, host and port.

### 1.2 Create the application

1. In the Authentik admin interface, go to **Applications › Applications** and create a new application **with a provider**.
2. Name it **CrossHub**, and give it the slug `crosshub`.
3. Provider: **OAuth2/OpenID Provider**.
   - **Authorization flow:** the implicit-consent flow skips the "allow access" screen; the explicit one shows it. Either works.
   - **Client type:** Confidential.
   - **Redirect URIs:** the address from the table above, set to *Strict*.
   - **Signing key:** select a certificate. Without one, Authentik signs tokens with the client secret. That also works, because the API receives `OIDC_CLIENT_SECRET` too.
4. Save. Then open the provider and copy three values:
   - **Client ID**
   - **Client Secret**
   - **OpenID Configuration Issuer**, which looks like `https://auth.example.com/application/o/crosshub/`

### 1.3 Who may use it

There are two ways to limit access, and you can use both:

- **In Authentik:** on the application, open **Policy / Group / User Bindings** and bind the groups or users who may use it. Authentik then refuses everyone else before they reach CrossHub.
- **In CrossHub:** set `OIDC_ALLOWED_GROUPS=crosshub-users` (several are comma separated). Authentik sends group names in the `profile` scope, and the API refuses anyone in none of them. They see *"Your account is not in a group that is allowed to use CrossHub."*

### 1.4 Turn it on in CrossHub

In the **top-level `.env`** (next to `docker-compose.yaml`, not `api/.env`):

```bash
OIDC_ISSUER=https://auth.example.com/application/o/crosshub/
OIDC_CLIENT_ID=<Client ID>
OIDC_CLIENT_SECRET=<Client Secret>
OIDC_NAME=Authentik
```

Then:
```bash
docker compose up -d
```
No rebuild is needed, because these are read when the containers start. The login page now shows **Continue with Authentik** above the email form.

Docker passes these to both the API and the dashboard. The dashboard runs the sign-in. The API checks Authentik's ID token itself, against Authentik's published keys, before anyone is signed in.

**Check that the containers can reach Authentik.** Both the dashboard and the API fetch the issuer's settings server side:
```bash
docker compose exec textbee-api sh -c 'wget -qO- "${OIDC_ISSUER%/}/.well-known/openid-configuration"' | head -c 200
```
If that fails while your browser can open the same address, the containers can't reach Authentik's network. See [Part 2](#part-2-netbird) if Authentik itself is only on NetBird.

### 1.5 Your existing account

The first time you sign in with Authentik, CrossHub looks for an account with the same email.

- **New accounts:** if there is none, it creates one. To create accounts only by hand, set `OIDC_ALLOW_SIGNUP=false`.
- **Existing accounts:** if one exists, it links only when Authentik says the email is verified. Otherwise anyone who can set that email in Authentik could take the account over. **Authentik's default email mapping always says `email_verified: false`**, so an existing password account is not linked at first. You'll see *"An account with your email already exists…"*.

There are two ways to link your existing account:

- **Recommended:** in Authentik, make a copy of the *OpenID 'email'* scope mapping that returns `"email_verified": True`, and select it on the provider instead of the default. This is only appropriate if users can't change their own email. Remove the email field from the user settings flow, or keep emails admin-managed.
- **Or:** set `OIDC_TRUST_EMAIL=true` in `.env`. This has the same caveat: it's safe only on an Authentik where you control everyone's email.

After the first sign-in, the account is tied to your Authentik user ID (`sub`), not your email. Changing an email later, in either place, can't move it to someone else.

### 1.6 Make Authentik the only way in (optional)

Once single sign-on works for you:

```bash
PASSWORD_LOGIN=false       # no email/password sign-in, reset or sign-up
ALLOW_REGISTRATION=false   # no sign-up form (implied by the line above)
```
Then run `docker compose up -d`.

The API refuses password login, sign-up and password reset. The dashboard shows only the Authentik button. You can't lock yourself out by accident: while `OIDC_ISSUER` is empty, the dashboard keeps showing the password form.

Phones and scripts are unaffected. They use API keys, not sign-in.

---

## Part 2: NetBird

[NetBird](https://netbird.io) is a WireGuard mesh network, like Tailscale. Installed on your devices, it gives each one a private address, usually `100.x.y.z`, that only your other NetBird devices can reach.

### 2.1 Join the devices

Install NetBird and sign in on:
- the **server** (the computer running Docker)
- every **browser device** you'll use the dashboard from
- the **Mac relay** Mac
- **phones** that send messages: there's a NetBird app for iPhone and Android, and the Android app and iPhone Shortcut need to reach the API

On the server, find its NetBird address and name:
```bash
netbird status    # look for "NetBird IP" and the FQDN
```

### 2.2 Listen only on NetBird

In the top-level `.env`:
```bash
BIND_ADDRESS=100.x.y.z          # the server's NetBird IP
```
That publishes both the dashboard and the API on the NetBird address only. To keep the API on your home Wi-Fi as well, for a phone without NetBird, split them:
```bash
WEB_BIND_ADDRESS=100.x.y.z      # dashboard: NetBird only
API_BIND_ADDRESS=0.0.0.0        # API: every network (it still needs an API key)
```

Point the addresses in `web/.env` and `api/.env` at the NetBird name or IP. This is [step 2.3 of the setup guide](SETUP.md#2-run-the-server), with `Your-iMac.local` replaced:
```bash
# web/.env
NEXT_PUBLIC_SITE_URL=http://imac.netbird.cloud:3000
NEXT_PUBLIC_API_BASE_URL=http://imac.netbird.cloud:3001/api/v1
NEXTAUTH_URL=http://imac.netbird.cloud:3000
# api/.env
FRONTEND_URL=http://imac.netbird.cloud:3000
API_PUBLIC_URL=http://imac.netbird.cloud:3001
APP_PUBLIC_URL=http://imac.netbird.cloud:3000
```
Then rebuild the dashboard, because the `NEXT_PUBLIC_*` values are built in:
```bash
docker compose up -d --build
```
If you use Authentik, update its redirect URI to the new `NEXTAUTH_URL`.

Check from the server:
```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN   # should show 100.x.y.z:3000, not *:3000
```
From a device not on NetBird, `http://<server's Wi-Fi IP>:3000` should now fail to connect.

**Start order:** Docker can only listen on the NetBird address while NetBird is connected. If the server boots and Docker starts first, the containers fail to publish their ports. Run `docker compose up -d` again once NetBird is up, or set NetBird to start at login before Docker Desktop.

`http://` is fine here: NetBird encrypts the traffic between devices. Leave `TRUST_PROXY_HOPS` empty, since there's no reverse proxy in front.

### 2.3 Allow only the right people

NetBird's starting policy lets every device reach every other. In the NetBird dashboard, under **Access Control › Policies**:

1. Put the server in a group, for example `crosshub-server`, and the people's devices in another, for example `crosshub-users`.
2. Add a policy: `crosshub-users` → `crosshub-server`, protocol TCP, ports `3000, 3001`.
3. Disable the default all-to-all policy, or narrow it, so other devices on your NetBird network can't reach the server.

### 2.4 If Authentik is only on NetBird too

Browsers on NetBird reach it directly. The containers reach it through the server's network, so run the `wget` check from [1.4](#14-turn-it-on-in-crosshub). If it fails, use the IP form of Authentik's address in `OIDC_ISSUER`, which must match exactly what Authentik reports as its issuer. Or run Authentik on the same server and Docker network.

---

## Putting it together

| You want | Settings |
|---|---|
| Authentik sign-in, still reachable on your Wi-Fi | `OIDC_*` set; `BIND_ADDRESS=0.0.0.0` |
| Private network only, email/password sign-in | `BIND_ADDRESS=<NetBird IP>`; no `OIDC_*` |
| Both: only NetBird devices can load it, only Authentik users can sign in | `BIND_ADDRESS=<NetBird IP>`, `OIDC_*` set, `PASSWORD_LOGIN=false`, NetBird policy as in 2.3 |

## Troubleshooting

| Message on the login page | Fix |
|---|---|
| *CrossHub could not reach the identity provider* | The API container can't fetch `OIDC_ISSUER…/.well-known/openid-configuration`. See the `wget` check in 1.4. |
| *The sign-in could not be verified* | Wrong `OIDC_CLIENT_ID`, the issuer doesn't match Authentik's exactly (keep the trailing `/`), or the server clocks are far apart. |
| *An account with your email already exists…* | See [1.5](#15-your-existing-account). |
| *Your account is not in a group…* | Add the user to a group in `OIDC_ALLOWED_GROUPS`, or clear it. |
| *There is no CrossHub account for you yet* | `OIDC_ALLOW_SIGNUP=false` and the account doesn't exist. |
| Authentik says "redirect URI mismatch" | The redirect URI must be exactly `NEXTAUTH_URL` + `/api/auth/callback/oidc`. |
| The button doesn't appear | `OIDC_ISSUER`, `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` must all be set in the top-level `.env`; then run `docker compose up -d`. |
