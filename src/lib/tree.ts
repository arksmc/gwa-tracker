import type { GradeComponent } from '../types'

export function mapComponent(
  node: GradeComponent,
  id: string,
  fn: (c: GradeComponent) => GradeComponent
): GradeComponent {
  if (node.id === id) return fn(node)
  return {
    ...node,
    subcomponents: node.subcomponents.map((s) => mapComponent(s, id, fn)),
  }
}

export function removeComponent(node: GradeComponent, id: string): GradeComponent {
  return {
    ...node,
    subcomponents: node.subcomponents
      .filter((s) => s.id !== id)
      .map((s) => removeComponent(s, id)),
  }
}

export function newComponent(name: string, weight: number): GradeComponent {
  return {
    id: crypto.randomUUID(),
    name,
    weight,
    subcomponents: [],
    assessments: [],
  }
}