'use client'

import Link from 'next/link'
import { clsx } from 'clsx'
import { ReactNode, forwardRef } from 'react'

interface ButtonProps {
  children: ReactNode
  href?: string
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(
    {
      children,
      href,
      variant = 'primary',
      size = 'md',
      className = '',
      onClick,
      type = 'button',
      disabled = false,
    },
    ref
  ) {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2'

    const variants = {
      primary:
        'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:from-primary-700 hover:to-primary-600 focus:ring-primary-500 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30',
      secondary:
        'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-500 shadow-lg',
      outline:
        'border-2 border-slate-300 text-slate-700 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
      ghost:
        'text-slate-600 hover:text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
    }

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-8 py-4 text-base',
    }

    const classes = clsx(
      baseStyles,
      variants[variant],
      sizes[size],
      disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
      className
    )

    // If href is provided and no onClick, render as Link
    if (href && !onClick) {
      return (
        <Link
          href={href}
          className={classes}
          ref={ref as React.Ref<HTMLAnchorElement>}
          aria-disabled={disabled}
        >
          {children}
        </Link>
      )
    }

    // If href is provided WITH onClick, use button that navigates programmatically
    // This handles the case where we need onClick to fire (e.g., closing mobile menu)
    if (href && onClick) {
      const handleClick = () => {
        onClick()
        // Navigate after onClick completes
        window.location.href = href
      }

      return (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className={classes}
          ref={ref as React.Ref<HTMLButtonElement>}
          aria-disabled={disabled}
        >
          {children}
        </button>
      )
    }

    // Default: render as button
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={classes}
        ref={ref as React.Ref<HTMLButtonElement>}
        aria-disabled={disabled}
      >
        {children}
      </button>
    )
  }
)

export default Button
