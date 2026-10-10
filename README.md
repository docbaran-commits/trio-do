# 3 Lists

A personal to-do list for your phone. Tasks sit in three lanes:

- **Now** is red. What you should do next.
- **Late** is yellow. What’s already slipping.
- **Later** is green. What’s still ahead.

Every task has a due date. The list is saved in the browser on that phone. Nothing is sent to a server.

## Run it locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

## Put it on your iPhone

This is a progressive web app. You do not need the App Store, and you do not need a paid Apple developer account to “sign” it. Safari installs it onto the home screen, and it opens full screen without the browser toolbar.

1. Deploy the app, or open it on a public `https://` address. iPhone will not install a page served from `http://` on another computer.
2. On the iPhone, open the page in **Safari**. Chrome on iPhone cannot add it to the home screen.
3. Tap the **Share** button.
4. Tap **Add to Home Screen**, then **Add**.

The icon is labeled **3 Lists**. Your tasks stay in that installed app. If you clear Safari website data, the list is erased, so export a backup from the bottom of the screen first. On iPhone, the export opens the share sheet — save it to Files.

After you publish the site, the installed app can also open once without a connection. The tasks themselves were already stored on the phone.

## Scripts

- `npm run dev` — local app on port 43123
- `npm run test` — date and backup checks
- `npm run lint` — lint
- `npm run build` — production build
