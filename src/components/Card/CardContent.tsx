const CardContent = ({
  children,
  className = "",
  ...props
}: { children: React.ReactNode; className?: string; [key: string]: any }) => {
  return (
    <div className={`${className}`} {...props}>
      {children}
    </div>
  )
}

export default CardContent;
