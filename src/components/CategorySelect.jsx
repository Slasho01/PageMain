import { useCategoryTree } from '../lib/catalog'

/** <select> de categorías mostrando la jerarquía (Computación › Notebooks). */
export default function CategorySelect({ value, onChange, exclude, emptyLabel = 'Sin categoría', includeInactive }) {
  const { tree } = useCategoryTree()
  const rows = []
  const walk = (nodes, depth) => nodes.forEach((c) => {
    if (c.id === exclude) return
    if (!includeInactive && !c.estatus) return
    rows.push({ id: c.id, label: `${'   '.repeat(depth)}${depth ? '› ' : ''}${c.nombre}` })
    walk(c.children, depth + 1)
  })
  walk(tree.roots, 0)
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">{emptyLabel}</option>
      {rows.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
    </select>
  )
}
