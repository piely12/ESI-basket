// Affiche un texte d'actualité : paragraphes séparés par une ligne vide, **gras** pris en charge.
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-bold text-brand">{part.slice(2, -2)}</strong>
      : part)
}

export default function NewsBody({ body }: { body: string }) {
  return (
    <div className="space-y-4 text-base leading-relaxed text-foreground sm:text-lg sm:leading-8">
      {body.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean).map((paragraph, i) => <p key={i}>{inline(paragraph)}</p>)}
    </div>
  )
}
