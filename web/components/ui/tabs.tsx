"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-[calc(var(--radius)*2.5)] bg-default p-1 text-muted",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-3xl px-4 text-sm font-medium transition-colors hover:text-foreground focus-visible:status-focused disabled:status-disabled data-[state=active]:bg-segment data-[state=active]:text-segment-foreground data-[state=active]:shadow-surface",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 outline-none focus-visible:status-focused",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

/*
 * The same segmented look for controls that are not Radix tabs (route links,
 * the theme switch), so every pill switcher in the app is one design.
 */
const segmentedList =
  "inline-flex items-center gap-0.5 rounded-[calc(var(--radius)*2.5)] bg-default p-1"
const segmentedItem = (active: boolean) =>
  cn(
    "inline-flex h-8 shrink-0 items-center justify-center rounded-3xl px-4 text-sm font-medium transition-colors focus-visible:status-focused",
    active
      ? "bg-segment text-segment-foreground shadow-surface"
      : "text-muted hover:text-foreground"
  )

export { Tabs, TabsList, TabsTrigger, TabsContent, segmentedList, segmentedItem }
