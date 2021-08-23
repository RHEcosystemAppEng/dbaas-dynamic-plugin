import * as React from 'react'

type FormBodyProps = {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  flexLayout?: boolean
}

const FormBody: React.FC<FormBodyProps & React.HTMLProps<HTMLDivElement>> = ({
  children,
  className,
  style,
  flexLayout = false,
  ...props
}) => (
  <div
    {...props}
    className="pf-c-form"
    style={
      flexLayout
        ? { display: 'flex', flex: 1, flexDirection: 'column', paddingBottom: 0, ...(style ?? {}) }
        : { paddingBottom: 0, ...(style ?? {}) }
    }
  >
    {children}
  </div>
)

export default FormBody
