# Building the shortcut by hand on iPhone or iPad

Use this if you can't import the `.shortcut` file. iOS only imports signed
shortcut files, and signing needs a Mac. The steps below build the same
workflow directly in the Shortcuts app. It takes about five minutes.

Action and menu names below are from iOS 17/18 in English. They may differ
slightly on other versions.

## 0. Allow scripts (one time)

**Settings → Apps → Shortcuts → Advanced → Allow Running Scripts** → on.
(On iOS 17 and earlier: **Settings → Shortcuts → Advanced**.)

Without this, the "Run JavaScript on Web Page" action refuses to run.

## 1. Put the script on your clipboard

The script is [`dist/shortcut-script.js`](../dist/shortcut-script.js), about
90 KB. Selecting that much text by hand in Safari is unreliable, so use a
throwaway shortcut to copy it:

1. In Shortcuts, tap **+** to make a new shortcut.
2. Add **Get Contents of URL** and set the URL to the raw file:
   `https://raw.githubusercontent.com/hughfletcher/share-as-markdown/main/dist/shortcut-script.js`
3. Add **Copy to Clipboard**.
4. Tap ▶︎ to run it once, then delete this helper shortcut.

This is the only step that uses the network. The finished shortcut contains
the whole script and never downloads anything.

## 2. Create the shortcut

1. Tap **+** to make a new shortcut and name it **Web to Markdown**.
2. Tap the **ⓘ** (details) button. Turn on **Show in Share Sheet**, then tap Done.
3. A block appears at the top: *Receive **Any** input from **Share Sheet***.
   Tap **Any**, choose **Clear**, then select only **Safari web pages**.
   If no input, choose **Stop and Respond**.

## 3. Add the actions

Add these actions in this order. Search for each one by name in the action
search bar.

1. **Run JavaScript on Web Page**
   - Its input should read **Shortcut Input**. If it doesn't, tap it and pick *Shortcut Input*.
   - Tap the script area, select all the sample code, delete it, and paste
     the script from your clipboard.

2. **Get Dictionary Value**: *Get **Value** for **error** in **Result of JavaScript***.

3. **If**: *If **Dictionary Value** **has any value***.
   - Inside the If, add **Show Alert**. Set the message to the *Dictionary Value* variable, and turn off *Show Cancel Button*.
   - Under the alert, still inside the If, add **Stop This Shortcut**.
   - Delete the empty **Otherwise** section if you like. Keep **End If**.

4. Below **End If**, add **Get Dictionary Value**: *Get **Value** for **markdown** in **Result of JavaScript***.
   To pick *Result of JavaScript*, tap the dictionary field, choose
   **Select Variable**, and tap the output of the Run JavaScript action.

5. **Set Variable**: set variable **Markdown** to **Dictionary Value**.
   Type the name `Markdown` yourself.

6. **Get Dictionary Value**: *Get **Value** for **filename** in **Result of JavaScript***.
   Pick *Result of JavaScript* the same way as in step 4.

7. **Set Variable**: set variable **Filename** to **Dictionary Value**.

8. **Set Name**: *Set name of **Markdown** to **Filename***.
   - Tap each field, choose **Select Variable**, and tap the variable with
     that name. Both fields should show a variable bubble, not typed text.
   - Tap the expand arrow (›) and make sure **Don't Include File Extension** is **off**.

9. **Share**: *Share **Renamed Item***.
   - Tap the field and pick **Renamed Item**, the output of Set Name. If it
     says *Markdown* or *Dictionary Value*, Telegram receives plain text
     instead of a file.

Tap **Done**. The shortcut is finished.

## 4. Use it

Open an article in Safari, tap **Share**, and tap **Web to Markdown**. If it
isn't in the list, scroll down and tap **Edit Actions…** to add it to your
favourites. The first time you use it on each website, iOS asks whether the
shortcut may access that site. Choose **Allow**. A Share Sheet then opens with
the `.md` file.

## If the file arrives as "Text"

If Telegram or Files gets a file named **Text** (no title, no `.md`), the
shortcut is sharing the raw text instead of the named file, and Telegram
may fail on the next share. Open the shortcut and check:

1. **Share** says *Share **Renamed Item***, not *Markdown* or *Dictionary Value*.
2. **Set Name** says *Set name of **Markdown** to **Filename***, both as
   variable bubbles.
3. **Don't Include File Extension** under Set Name is **off**.

To see the file before sharing, temporarily add **Quick Look** between
Set Name and Share. The title bar should show `<Article title>.md`.

## Updating

To update to a newer version, repeat step 1. Then open the shortcut, select
all the code in the Run JavaScript action, and paste the new script over it.
