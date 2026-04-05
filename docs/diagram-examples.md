# Diagram Examples (Mermaid)

This blog supports rendering Mermaid diagrams directly from Markdown fenced code blocks.

## Flowchart

```mermaid
graph TD
  A[Start] --> B[Process]
  B --> C[End]
```

## Sequence Diagram

```mermaid
sequenceDiagram
  participant Alice
  participant John
  Alice->>John: Hello John, how are you?
  John-->>Alice: Great!
```

## Class Diagram

```mermaid
classDiagram
  Animal <|-- Dog
  Animal <|-- Cat
  Animal : +int age
  Animal : +String name
  Animal : +eat()
  Dog : +bark()
```

## State Diagram

```mermaid
stateDiagram-v2
  [*] --> Still
  Still --> [*]
  Still --> Moving
  Moving --> Still
```

## ER Diagram

```mermaid
erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  CUSTOMER {
    string id
    string name
  }
  ORDER {
    string id
    date created_at
  }
```

## Gantt Chart

```mermaid
gantt
  title Project Timeline
  dateFormat  YYYY-MM-DD
  section Planning
  Spec        :a1, 2024-01-01, 10d
  Design      :a2, after a1, 7d
  section Build
  Implement   :b1, after a2, 14d
  Test        :b2, after b1, 7d
```

## Pie Chart

```mermaid
pie
  title Pets
  "Dogs": 42
  "Cats": 38
  "Birds": 20
```

## Git Graph

```mermaid
gitGraph
  commit id: "init"
  branch develop
  checkout develop
  commit id: "work"
  checkout main
  merge develop
  commit id: "release"
```

## Best Practices

- Prefer short labels on mobile; long labels can overflow and require more panning.
- Keep diagrams focused: one concept per diagram.
- If a diagram fails to render, switch to "View Code" and validate the Mermaid syntax.

