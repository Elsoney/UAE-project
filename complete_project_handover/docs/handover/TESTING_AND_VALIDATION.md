# Testing and Validation

**Snapshot:** 2026-10-09. Commands were run in `frontend/` from repository HEAD `d6cfff2`; see `REPOSITORY_INVENTORY.md` for environment details.

## Execution log

- `npm run lint`: **PASS**.
- `npm exec tsc -- --noEmit`: **PASS**.
- `npm run build`: **PASS**; static routes `/`, `/_not-found`, `/admin`.
- Automated tests: **NOT AVAILABLE**; `frontend/package.json` has no test script and no test suite was found.
- Database migration / live RLS tests: **NOT RUN**; no migration directory exists and no remote service was contacted.
- External integration smoke tests: **NOT RUN**.

## Reproduce local checks

From the repository root:

```powershell
Push-Location frontend
npm ci
npm run lint
npm exec tsc -- --noEmit
npm run build
Pop-Location
```

`npm ci` is listed as the lockfile-based clean-install procedure but was not run during this verification. Run payment and database tests only against approved sandbox/disposable environments, never production.

## Future smoke-test matrix

| Test | Expected behavior from PRD |
|---|---|
| Arabic/English UI | Arabic RTL, English LTR, language switch persists |
| Menu/order | Active items priced in AED, cart totals correct, inactive items rejected |
| Catering form | Required data validated, unique request created as Pending Review |
| Review | Admin can confirm price and date; request not marked confirmed prematurely |
| Deposits | no/fixed/percentage/full options; invalid over-total blocked |
| Payment success | server-verified gateway event authoritatively changes payment state |
| Webhook repeated | one payment record; no duplicated commission |
| Failure/retry | failed payment recoverable without false confirmation |
| Commission/refund | accurate source-linked net basis according to approved agreement |
| Authorization | nonadmins cannot read/manage sensitive orders |
| Discovery/SEO | correct location, localized metadata, sitemap and canonical tags |
| Accessibility | critical ordering flows usable on mobile including RTL |

These are PRD expectations, not implemented or tested functionality. Keep payment checks in provider sandbox and database checks in a disposable development project.
