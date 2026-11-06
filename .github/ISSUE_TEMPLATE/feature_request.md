name: Feature Request / Proposta di Funzionalità
description: Proponi una nuova funzionalità o estensione per CrowdQA / Propose an idea or enhancement
labels: ["enhancement"]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problema o opportunità / Problem or opportunity
      description: Quale ostacolo riscontri o cosa vorresti migliorare? / What problem does this address?
    validations:
      required: true
  - type: textarea
    id: proposal
    attributes:
      label: Proposta di soluzione / Proposed solution
      description: Descrivi il comportamento desiderato / Describe the desired feature
    validations:
      required: true
