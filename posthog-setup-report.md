<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Prague Hike Ticket Finder app. PostHog is initialized in `src/main.tsx` using environment variables, with the `PostHogProvider` wrapping the entire app. Five custom events are tracked at key user actions across the search and result flow — covering destination selection, party choice, ticket discovery, and purchase intent.

| Event                   | Description                                                                         | File                                  |
| ----------------------- | ----------------------------------------------------------------------------------- | ------------------------------------- |
| `stop_selected`         | User picks a destination stop from the autocomplete dropdown                        | `src/components/steps/HybridStep.tsx` |
| `party_selected`        | User selects a party type (single, small group, large group)                        | `src/components/steps/HybridStep.tsx` |
| `ticket_found`          | User submits the form and sees their recommended ticket — the main conversion event | `src/App.tsx`                         |
| `purchase_link_clicked` | User clicks the PID Lítačka link to purchase the recommended ticket                 | `src/App.tsx`                         |
| `new_search_started`    | User resets the wizard and starts a new search after seeing a result                | `src/App.tsx`                         |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://eu.posthog.com/project/170424/dashboard/655357
- **Conversion Funnel: Search → Ticket → Purchase**: https://eu.posthog.com/project/170424/insights/p204DzZJ
- **Ticket Types Recommended**: https://eu.posthog.com/project/170424/insights/gMLnyQ3w
- **Party Type Distribution**: https://eu.posthog.com/project/170424/insights/ol89Sdni
- **Daily Ticket Searches**: https://eu.posthog.com/project/170424/insights/LJQ8DACD
- **Top Destination Stops**: https://eu.posthog.com/project/170424/insights/o14rk1HP

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
