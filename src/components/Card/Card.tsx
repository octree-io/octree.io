const Card = ({
  children,
  className = "",
  ...props
}: { children: React.ReactNode; className?: string; [key: string]: any }) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`} {...props}>
      {children}
    </div>
  )
}

export default Card;
