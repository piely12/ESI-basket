type PageTitleProps = {
  title: string
  subtitle?: string
}

export default function PageTitle({ title, subtitle }: PageTitleProps) {
  return (
    <header className="page-title-block">
      <h1 className="page-title-heading">{title}</h1>
      {subtitle && <p className="page-title-subtitle">{subtitle}</p>}
      <span className="page-title-underline" aria-hidden="true" />
    </header>
  )
}
