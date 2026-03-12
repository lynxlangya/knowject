# Security Policy

## Supported Versions

Knowject is currently in an active foundation stage. Security fixes are only guaranteed for the latest state of the `main` branch.

| Version                | Supported |
| ---------------------- | --------- |
| `main`                 | Yes       |
| older commits or forks | No        |

## Reporting a Vulnerability

Please do not open a public GitHub issue for suspected vulnerabilities.

Use one of the following private paths instead:

- GitHub private vulnerability reporting for this repository, if it is enabled
- The maintainer contact information published on the GitHub profile, if private reporting is not available

When reporting, include:

- A clear description of the issue
- Steps to reproduce
- Affected files, routes, or environments
- Expected impact
- Any proof-of-concept details needed to verify the issue

The maintainer will try to acknowledge valid reports within 5 business days and follow up with remediation guidance or a patch plan when the issue is confirmed.

## Scope

Security-sensitive areas in the current repository include:

- Authentication and JWT handling
- Password hashing and credential flow
- Environment variable and Docker secrets handling
- Project and membership authorization checks
- API error handling and transport security requirements

## Disclosure Guidance

- Keep the report private until the issue is understood and a fix or mitigation is available.
- Avoid sharing secrets, tokens, or live credentials in reports.
- If a fix requires documentation changes or configuration rotation, those should ship with the remediation.
