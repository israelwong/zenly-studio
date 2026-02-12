"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

interface PopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  /** Cuando true, muestra un backdrop con blur que cierra el popover al hacer clic fuera */
  showBackdrop?: boolean
  /** Requerido cuando showBackdrop: estado open del Popover */
  open?: boolean
  /** Requerido cuando showBackdrop: callback para cerrar */
  onOpenChange?: (open: boolean) => void
}

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(
  (
    {
      className,
      align = "center",
      sideOffset = 4,
      style,
      showBackdrop = false,
      open: openProp,
      onOpenChange,
      ...props
    },
    ref
  ) => (
    <>
      {showBackdrop &&
        openProp &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] pointer-events-auto bg-transparent backdrop-blur-[2px]"
            aria-hidden
            onClick={() => onOpenChange?.(false)}
          />,
          document.body
        )}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={ref}
          align={align}
          sideOffset={sideOffset}
          className={cn(
            "z-[100000] w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className
          )}
          style={{ zIndex: 100000, ...style } as React.CSSProperties}
          {...props}
        />
      </PopoverPrimitive.Portal>
    </>
  )
)
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
