<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Internal Sawaz Pilot screens scope their theme under the `.pilot` class (StudioShell, auth, set-password); never change `:root` tokens for Pilot, because the collection screens share them.
- Pilot authenticated server calls use the external connection's VITE public configuration plus a remotely verified user bearer token, never bootstrap roles or fall back to service-role access; this preserves Core RLS and existing invitations.
- Keep the shared privileged server client unchanged while Collect uses it; publication link/session/notification dependencies remain explicitly outside the service-role-free Clients/dossier read path.
