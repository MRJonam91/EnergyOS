name: Bug Report / Segnalazione Bug
description: Segnala un problema o difetto in CrowdQA / Report an issue or bug in CrowdQA
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: Grazie per aver segnalato un problema. Ricorda di non includere dati sensibili / Thanks for reporting. Do not include secrets.
  - type: textarea
    id: description
    attributes:
      label: Descrizione del bug / Bug description
      description: Spiega chiaramente cosa accade / Explain what happens
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Passaggi per riprodurre / Steps to reproduce
      placeholder: |
        1. crowdqa init
        2. ...
    validations:
      required: true
  - type: input
    id: environment
    attributes:
      label: Ambiente / Environment
      placeholder: Node.js version, OS, crowdqa version
    validations:
      required: true
