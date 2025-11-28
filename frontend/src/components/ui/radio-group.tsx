import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  name?: string
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, name, children, ...props }, ref) => {
    // Generate a unique name if not provided
    const groupName = React.useMemo(() => name || `radio-group-${Math.random().toString(36).substr(2, 9)}`, [name])
    
    return (
      <div
        ref={ref}
        className={cn("grid gap-2", className)}
        role="radiogroup"
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
          
            if (child.type && (child.type as any).displayName === 'RadioGroupItem') {
              return React.cloneElement(child, {
                ...child.props,
                name: child.props.name || groupName,
                checked: child.props.value === value,
                onCheckedChange: onValueChange,
              } as any)
            } else {
              // For non-RadioGroupItem children, recursively process their children
              // Don't pass onCheckedChange to non-input elements
              const childProps = child.props as any
              const { onCheckedChange, ...childPropsWithoutHandler } = childProps
              return React.cloneElement(child, {
                ...childPropsWithoutHandler,
                children: React.Children.map(child.props.children, (grandChild) => {
                  if (React.isValidElement(grandChild) && grandChild.type && (grandChild.type as any).displayName === 'RadioGroupItem') {
                    const grandChildProps = grandChild.props as any
                    return React.cloneElement(grandChild, {
                      ...grandChildProps,
                      name: grandChildProps.name || groupName,
                      checked: grandChildProps.value === value,
                      onCheckedChange: onValueChange,
                    } as any)
                  }
                  return grandChild
                }),
              } as any)
            }
          }
          return child
        })}
      </div>
    )
  }
)
RadioGroup.displayName = "RadioGroup"

interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string
  checked?: boolean
  onCheckedChange?: (value: string) => void
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, checked, onCheckedChange, id, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="radio"
        id={id}
        value={value}
        checked={checked}
        onChange={(e) => {
          if (e.target.checked && onCheckedChange) {
            onCheckedChange(value)
          }
        }}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
