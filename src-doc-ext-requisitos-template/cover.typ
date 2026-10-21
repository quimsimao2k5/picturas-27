// Capa do relatório.
#let cover(title: "", subtitle: "", group: "", authors: (), string_date) = {
  let render_authors = grid(
    columns: 1,
    gutter: 10pt,
    ..authors.map(it => [
      #text(size: 11pt, weight: "bold", it.name)
      #text(size: 11pt, it.number)
    ]),
  )

  {
    set page(paper: "a4", margin: (x: 0cm, y: 0cm), numbering: none)

    rect(fill: rgb("#C76C1B"), height: 100%, width: 20.3%)

    place(bottom + left, dx: 65pt, dy: -40pt, {
      text(weight: "bold", size: 100pt, fill: white, [R])
      text(weight: "bold", size: 100pt, fill: rgb("#C76C1B"), [AS])
    })

    {
      set place(top + left, dx: 200pt)
      place(dy: 120pt, image("images/ee-um.png", height: 8%))
      place(dy: 200pt, {
        text(size: 10pt, weight: "bold", fill: gray, [Universidade do Minho\ ])
        text(size: 9pt, fill: gray, [Escola de Engenharia\ Mestrado em Engenharia Informática\ ])
      })
      place(dy: 300pt, {
        text(size: 20pt, fill: black, weight: "bold", [Unidade Curricular de \
          Requisitos e Arquiteturas \ de Software])
        text(size: 10pt, [\ 2026/2027])
      })
      place(dy: 440pt, block(width: 330pt, {
        text(size: 20pt, weight: "bold", title)
        if subtitle != "" { linebreak(); text(size: 14pt, subtitle) }
        if group != "" { linebreak(); v(4pt); text(size: 12pt, fill: gray, group) }
      }))
      place(dy: 570pt, render_authors)
      place(dy: 700pt, text(size: 12pt, string_date))
    }
  }
  {
    set page(numbering: none)
    align(top + right, table(
      columns: 2 * (115pt,),
      align: top + left,
      rows: (20pt, 20pt, 20pt, 40pt),
      stroke: (dash: "densely-dotted", thickness: 0.75pt),
      [Data da Receção], [],
      [Responsável], [],
      [Avaliação], [],
      [Observações], [],
    ))

    align(bottom + left, {
      text(size: 18pt, weight: "bold", title)
      if subtitle != "" { linebreak(); text(size: 13pt, subtitle) }
      v(30pt)
      set text(size: 12pt)
      render_authors
      v(10pt)
      string_date
    })
  }
}
