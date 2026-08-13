role: harness guide — mandatory for any agent/AI acting in this repo
caveman: full
load_before_any_task:
  - .specs/SPECS.md
  - .specs/SKILLS.md
  - .specs/ADRS.md
rules:
  - specs_are_source_of_truth
  - no_code_without_matching_spec
  - new_decision_becomes_adr
  - update_changelog_every_session
  - keep_specs_synchronized_with_code
specs:
  index: .specs/SPECS.md
  skills_index: .specs/SKILLS.md
  adrs: .specs/ADRS.md
  skills_dir: .specs/skills/
  spec_naming: ".specs/{feature}-{module}-spec.md"
changelog:
  path: CHANGELOG.md
  format: |
    # DD-MM-YYYY
    ## <session title>
    ### pr
    <pr link>
    ### done
    <summary: tech used, adr count, files touched>
