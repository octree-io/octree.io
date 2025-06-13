const Button = ({
  children,
  variant = "default",
  size = "default",
  textColor = "text-white",
  className = "",
  ...props
}: {
  children: React.ReactNode
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "lg"
  textColor?: string
  className?: string
  [key: string]: any
}) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-lg font-medium cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"

  const variants = {
    default: "bg-purple-600 hover:bg-purple-700 shadow-sm",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    ghost: "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
  }

  const sizes = {
    default: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  }

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${textColor} ${className}`} {...props}>
      {children}
    </button>
  )
}

export default Button;
