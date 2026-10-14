# Prosit!: party-day checklist

For Simon, on the day. Everything here happens on the deployed site, never against the local stack.

## The day before

1. **Wake the database.** The free Supabase plan pauses a project after a week without traffic.
   Open the Supabase dashboard, check that the project `prosit` is running ("Restore" if paused),
   then open the site once on a phone and see the join screen (not "Ingen anslutning").
2. **Real phones.** Join from an iPhone on the deployed URL. In Safari: Share, "Lägg till på
   hemskärmen", so it opens full screen with the shield icon. Try a Duell between two phones.
3. **The TV laptop.** Chrome, `/tv`, tap "Starta kvällen" and listen: the bell, then the
   playlist. Turn off sleep and the screen saver (macOS: Settings, Lock Screen, "Never"; or run
   `caffeinate -d` in a terminal). Volume up, HDMI audio selected.
4. Don't run `npm run bots` against the hosted project from now on: it wipes the night.

## Before the guests arrive

1. **Reset with wipe.** On any phone that is still joined: "Ny kväll", tick "Stryk även
   matrikeln", "Ja, nollställ". Every phone is signed out and the TV shows the big join QR.
   (No phone joined any more? Join once with a throwaway name, then reset with wipe.)
2. **TV.** Laptop on HDMI, Chrome full screen (`Cmd+Ctrl+F`) on `/tv`, tap "Starta kvällen" once.
   Nothing on the TV needs touching after that.
3. **Everyone joins** by scanning the QR on the TV: name plus a colour. Everyone reloads if they
   had the site open from an older build.
4. **One phone** taps "Starta kvällen". Events start at the default 12 min interval; "Tätare" /
   "Glesare" changes it. PROSIT! comes about every ten minutes on its own clock.

## During the night

- Drinks: "+1" on the phone, "Ångra senaste" for a mistake.
- Strafen: "Dela ut en Strafe" on any phone.
- Lost a phone, swapped it or cleared its data? Don't join again. On any joined phone:
  "Matrikeln", "Visa ett medlemskort", pick the member, and scan the QR with the new phone (or
  type the code on its join screen). Drinks and Strafen stay; the old phone loses its place.
- The TV says "Ingen anslutning": it retries by itself. Check the Wi-Fi.
- The music stops: reload `/tv` and tap "Starta kvällen" again. The night carries on.

## The finale

1. Any phone: "Avsluta kvällen", "Ja, avsluta". The log closes.
2. The TV runs the ceremony by itself: an intro, then one award every 15 s with a drum roll, the
   grand prize (Herr Präsident für eine Nacht) last, then the final protocol, which stays up.
3. Every phone shows "Dina utmärkelser".
4. Next year: "Ny kväll" on a phone.
