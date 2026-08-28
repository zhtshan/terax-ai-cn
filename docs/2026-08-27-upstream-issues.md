# 上游 Issue 清单（crynta/terax-ai，2026-08-27 抓取）

> 来源：`gh issue list --repo crynta/terax-ai --state open --limit 200`
> 抓取时间：2026-08-27

## 一、Bug（46 个）

### #1222 — 打字速度快一点，字符就会被遗漏掉
- **标签**: bug
- **创建**: 2026-08-26  |  **更新**: 2026-08-26

### Terax version

0.8.6

### Operating system

macOS (Intel)

### OS version

macos 15.7.9 (24G830)

### What happened?

<img width="428" height="92" alt="Image" src="https://github.com/user-attachments/assets/b54b589e-435a-46cb-baff-7d186cf97116" /> 输入的是 pwd clear

### What did you expect to happen?

输入 clear 显示 clear 
输入 pwd 显示 pwd

### Steps to reproduce

1. 输入 pwd 只显示 pd 
2. 输入clear 只显示 clar

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #1157 — The herdr command cannot work properly in the terminal command‑line of the interface
- **标签**: bug
- **创建**: 2026-08-20  |  **更新**: 2026-08-20

### Terax version

0.5.9

### Operating system

macOS (Apple Silicon)

### OS version

Windows 11 家庭中文版

### What happened?

The herdr command cannot work properly in the terminal command‑line of the interface

### What did you expect to happen?

Expect herdr to work properly in the command‑line terminal.

### Steps to reproduce

Expect herdr to work properly in the command‑line terminal.

### Logs / screenshots

Expect herdr to work properly in the command‑line terminal.

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [ ] I am running the latest version (or this happens on `main`)

### #1154 — blocked by kaspersky
- **标签**: bug
- **创建**: 2026-08-19  |  **更新**: 2026-08-19

### Terax version

0.8.6

### Operating system

Windows

### OS version

win10 pro 22h2

### What happened?

blocked by kaspersky
reported with PDM:Trojan.Win32.Generic
version 0.8.6 downloaded from official website 

#830 this closed issue reproduce in another windows version

### What did you expect to happen?

no block by anti-virus

### Steps to reproduce

download the installer from official website 
common install process in win10 pro 22h2

### Logs / screenshots

_No response_

### Before submitting

- [ ] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #1137 — autogen commit message report:"Custom endpoint not found: f46e2124"
- **标签**: bug
- **创建**: 2026-08-14  |  **更新**: 2026-08-14

### Terax version

0.8.6

### Operating system

macOS (Apple Silicon)

### OS version

mac os 15.7.7

### What happened?

<img width="1103" height="550" alt="Image" src="https://github.com/user-attachments/assets/bf5e2bb4-a398-4b15-aaf7-11fafcffdee3" />

### What did you expect to happen?

can autogen commit message via the custom ai modal

### Steps to reproduce

1. open the git repo
2. config custom ai modal
3. click the gen commit message button

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #1132 — Codeblocks not embedding on Win11
- **标签**: bug
- **创建**: 2026-08-13  |  **更新**: 2026-08-13

### Terax version

0.8.6

### Operating system

Windows

### OS version

Windows 11

### What happened?

Codeblocks (``` test ``` or ` test `) are not embedding.

### What did you expect to happen?

The codeblocks to embed and show properly.

### Steps to reproduce

1. Ask AI to send a codeblock to you
2. Be on Windows 11
3. Watch it not embed codeblocks

### Logs / screenshots

<img width="576" height="236" alt="Image" src="https://github.com/user-attachments/assets/84c79831-c924-4955-a0ad-1c0b3882e2f3" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #1107 — Getting Request failed and "load failed"
- **标签**: bug
- **创建**: 2026-08-03  |  **更新**: 2026-08-03

### Terax version

0.8.6

### Operating system

macOS (Apple Silicon)

### OS version

macOS 27 -Golden Gate

### What happened?

Testing out Terax. But agnets flow is not working for me at all. Keep getting "Request failed". 

<img width="713" height="345" alt="Image" src="https://github.com/user-attachments/assets/314fbddc-f621-4224-ab8f-e38642b8aa86" />



### What did you expect to happen?

I expected that chat to work and give a response. 

### Steps to reproduce

1. Open Terax
2. Add Anthropic api key
3. Test chat with Cmd+I 

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #1104 — The links in markdown file can not be open in browser in ubuntu "Rendered" mode
- **标签**: bug
- **创建**: 2026-08-03  |  **更新**: 2026-08-05

### Terax version

0.8.6

### Operating system

Linux

### OS version

Kubuntu 25.10

### What happened?

When the link in markdown file was clicked, a popup showed"Open external link?". I clicked "Open link", then the popup disappeared and nothing happend. The browser in the system didn't change anything. 

### What did you expect to happen?

The browser should open the link. Or is it possible to open the link after clicking directly without asking or choosing?

### Steps to reproduce

1. Open terax
2. choose a markdown file containing a web link.
3. click the link
4. choose "Open link"

### Logs / screenshots

<img width="479" height="239" alt="Image" src="https://github.com/user-attachments/assets/64ddcc76-8dfd-41c0-a15a-c3861ebc4a5c" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #1089 — macOS下md文档图片和公式渲染失败
- **标签**: bug
- **创建**: 2026-08-01  |  **更新**: 2026-08-04

### Terax version

0.5.9

### Operating system

macOS (Apple Silicon)

### OS version

macOS15

### What happened?

md文档图片和公式渲染失败。

<img width="1482" height="332" alt="Image" src="https://github.com/user-attachments/assets/1f295ddb-8986-411b-a0a8-5d3fb8f2e861" />

<img width="2184" height="238" alt="Image" src="https://github.com/user-attachments/assets/d380301d-3ca2-4987-8b78-3acab0911c93" />

### What did you expect to happen?

图片不支持外链，没有使用 KaTeX/MathJax 的预览器。

### Steps to reproduce

md文档渲染相关

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #1083 — The rendering of Markdown preview differs significantly between the built-in preview and VS Code preview.
- **标签**: bug
- **创建**: 2026-07-30  |  **更新**: 2026-08-04

### Terax version

0.8.6

### Operating system

Linux

### OS version

Ubuntu24.04

### What happened?

**The rendering of Markdown preview differs significantly between the built-in preview and VS Code preview.

The first image shows rendering results from Terax; the second is rendered by VS Code.**

<img width="2014" height="599" alt="Image" src="https://github.com/user-attachments/assets/7fce1b46-8031-4619-b493-644f923f8ece" />
<img width="2044" height="1067" alt="Image" src="https://github.com/user-attachments/assets/008bd712-c1bb-472c-a262-e00936a30282" />

### What did you expect to happen?

Make the rendering consistent with VS Code.

<img width="2044" height="1067" alt="Image" src="https://github.com/user-attachments/assets/03e46146-6f9a-42bb-a3dc-6264b67fe203" />

### Steps to reproduce

The rendering of Markdown preview differs significantly between the built-in preview and VS Code preview.

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #1052 — Support for control + (y, j, k, n, p) to enhance keyboard only usage
- **标签**: bug
- **创建**: 2026-07-27  |  **更新**: 2026-07-28

### Terax version

0.8.5

### Operating system

macOS (Apple Silicon)

### OS version

macOS 27

### What happened?

When typing a command like `cd xyz` and choosing something from the pop-up (enter), the first entry is being chosen. Or the entry is not added to the shell at all. It's just the autocomplete of zoxide. So pressing enter does not work as intended.

### What did you expect to happen?

The selected entry should be added to the shell prompt.

### Steps to reproduce

https://github.com/user-attachments/assets/1af14067-fbc9-4576-89f5-5cecc7ced4fc

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #1039 — LSP doesn't works
- **标签**: bug
- **创建**: 2026-07-24  |  **更新**: 2026-08-24

### Terax version

0.8.5

### Operating system

Linux

### OS version

Fedora 44

### What happened?

I choose 5 of LSP's for TS, JSON, HTML, RUST, PHP. But any one doesn't work at all. 

### What did you expect to happen?

Fully working LSP.

### Steps to reproduce

Start's LSP

### Logs / screenshots

<img width="869" height="652" alt="Image" src="https://github.com/user-attachments/assets/98ac4440-2cf1-4d54-8cd8-a3638c465bde" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #1035 — Window Spliting (terminal multiplexing)
- **标签**: bug
- **创建**: 2026-07-22  |  **更新**: 2026-07-22

### Terax version

0.8.5

### Operating system

Windows

### OS version

11 26H2

### What happened?

So i have the terminal split in a 2 by 2 grid and it wont let me go further, i need another small terminal to do npm run dev in the same set of terminals.

### What did you expect to happen?

Let me create however many splits in whichever format I want

### Steps to reproduce

1. create a 2 by 2 grid by splitting the terminals, 
2. try to create more, it won't let me

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #1026 — copy paste inside harnes agents cli are not working
- **标签**: bug
- **创建**: 2026-07-18  |  **更新**: 2026-07-18

### Terax version

lastest

### Operating system

Windows

### OS version

windows 10

### What happened?

also scrolling 

### What did you expect to happen?

.....

### Steps to reproduce

....

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #1012 — Minimax reasoning display bug
- **标签**: bug
- **创建**: 2026-07-16  |  **更新**: 2026-08-14

### Terax version

0.8.5

### Operating system

Windows

### OS version

11

### What happened?

There are a lot of reasoning traces for one messages. The reasoning traces also appear after the models's response. The more you chat the more they stack.

<img width="524" height="621" alt="Image" src="https://github.com/user-attachments/assets/ab8a7071-7e9d-4e05-97c1-e54b8521d04c" />

<img width="517" height="701" alt="Image" src="https://github.com/user-attachments/assets/7500bb23-9d0e-4206-8aaf-2a31433805ed" />

<img width="656" height="256" alt="Image" src="https://github.com/user-attachments/assets/d110315c-c0d2-4b9d-af98-bec2dd749575" />

### What did you expect to happen?

One reasoning trace, no reasoning leakage.

### Steps to reproduce

1. Open Terax
2. Open Settings - Models - Provider. Fill as shown in image 3 of "What happened" + Minimax token plan api key (I don't use other providers so I can't speak for them).
3. Select the provider
4. Send a message
5. voilà

Also tested on CachyOS, same result.

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #1001 — IME-committed Chinese text duplicated on subsequent keystrokes in Terax terminal
- **标签**: bug
- **创建**: 2026-07-14  |  **更新**: 2026-07-14

### Terax version

0.8.5

### Operating system

Linux

### OS version

Ubuntu 24.04.4 LTS

### What happened?

When typing Chinese through fcitx5 inside the Terax terminal, previously committed text is replayed / duplicated on subsequent keystrokes. The IME engine used (Terax IME, fcitx5-pinyin, etc.) does not matter — the duplication happens regardless of which IME engine is active. Other GTK3 / GTK4 applications on the same system handle fcitx5 commits correctly.

## Expected behavior

Each committed string appears exactly once in the terminal input stream. The internal preedit / composition buffer is cleared after every commit.

## Actual behavior

Committed text is echoed again when the next keystroke is processed. For example, typing `我本机` followed by `打字` may result in `我本机我本机打字` appearing in the terminal. The duplication is not always 1:1 — it can accumulate across multiple commit cycles, producing repeated fragments that match earlier commits.

## Notes from diagnosis

- The bug is **specific to the Terax terminal** — typing the same way in GNOME Terminal, gedit, or a browser produces no duplication.
- It reproduces **independent of which fcitx5 engine** is selected (Terax IME, fcitx5-pinyin, etc.), which points to a bug in the terminal widget's IME commit handling rather than in the IME engine.
- It reproduces under both **native Wayland** and **GDK_BACKEND=x11** (XWayland).
- It reproduces with **WEBKIT_DISABLE_COMPOSITING_MODE=1** and **LIBGL_ALWAYS_SOFTWARE=1**, r...(truncated)

### #988 — Editor content not updated after discarding changes
- **标签**: bug
- **创建**: 2026-07-11  |  **更新**: 2026-07-18

### Terax version

0.8.5

### Operating system

Windows

### OS version

Windows 11 Pro 25H2

### What happened?

Discarding the changes was successful, but the displayed code is still the same as before

### What did you expect to happen?

It should change after successfully discarding the changes.

### Steps to reproduce

Steps:
1. Update our code, for example, by adding a comment like //test in main.go
2. Go to source control and discard the changes in main.go
Result: Discarding the changes was successful, but the displayed code is still the same as before (before discarding the changes).

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #984 — Git graph does not display branch and tag references on commits
- **标签**: bug
- **创建**: 2026-07-10  |  **更新**: 2026-07-10

### Terax version

0.8.2

### Operating system

Windows

### OS version

Windows 11

### What happened?

The Git Graph view displays the commit history and graph lanes, but it does not show branch or tag references next to the commits they point to.

For example, references such as:

- `main`
- `feature/example`
- `origin/main`
- version tags

are not visible anywhere in the commit list.

The graph lanes themselves render correctly, but they do not identify which lane or commit corresponds to each branch.
This appears to be either an incomplete implementation or a regression related to #20.

### What did you expect to happen?

Branch and tag references should be displayed as inline labels/chips beside the corresponding commit.

This was also part of the expected behavior described in #20:

> Description column: commit subject with branch / tag refs as inline chips

Without these references, it is difficult to understand where each local or remote branch currently points in the graph.

### Steps to reproduce

1. Open a repository containing multiple branches.
2. Open the Git Graph tab.
3. View commits pointed to by local or remote branches.
4. Observe that no branch or tag labels are displayed beside those commits.

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #977 — [WSL] Open tabs are lost after switching from "WSL: docker-desktop" back to "Windows Local"
- **标签**: bug
- **创建**: 2026-07-09  |  **更新**: 2026-07-09

### Terax version

0.8.2

### Operating system

Windows

### OS version

Window 11 23H2

### What happened?

I encountered a bug where all open editor tabs disappear after switching the environment context.

### What did you expect to happen?

Expected Behavior:
The previously opened tabs and workspace state should be restored or preserved when switching back to the original environment.
Actual Behavior:
All previously open tabs are closed/lost, and the workspace appears empty (or reset) upon returning to Windows Local.

### Steps to reproduce

1.Start with the environment set to Windows Local.
2.Have multiple files/tabs open in the editor spaces.
3.Switch the environment to WSL: docker-desktop.
4.Switch back to Windows Local.

### Logs / screenshots

<img width="354" height="250" alt="Image" src="https://github.com/user-attachments/assets/15fa18fd-d1f7-4ba4-9db7-aa834be44f1f" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #974 — yo, the ai agent was not working after connecting the LLM provides
- **标签**: bug
- **创建**: 2026-07-08  |  **更新**: 2026-07-08

### Terax version

0.8.2

### Operating system

Windows

### OS version

Win 11

### What happened?

<img width="465" height="436" alt="Image" src="https://github.com/user-attachments/assets/610a4522-c74e-4241-a731-30c824e3fc3a" />


the thing is the AI chatbox is not working, it showing that we got an error, dismiss

### What did you expect to happen?

idk what was happened, i need some resolving the issue would be great, this is happening for any LLM provider, groq, google, OpenRouter, OpenAI and more 

### Steps to reproduce

1.open tearx
2.click ctrl+i (default chat setting)
3. try searching anything or generating anything.
4.you'll end up by error message !

### Logs / screenshots

<img width="465" height="436" alt="Image" src="https://github.com/user-attachments/assets/1d5663d5-311b-4803-95f0-70251ab1b23f" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #965 — backspace/delete does not remove any charactors in history command
- **标签**: bug
- **创建**: 2026-07-07  |  **更新**: 2026-07-07

### Terax version

0.8.2

### Operating system

Windows

### OS version

windows 21H2

### What happened?

In Terax, pressing the Up Arrow recalls the previous command (`scoop install screentogit`). However, pressing Backspace moves the cursor left instead of deleting the character to its left. Pressing Delete also does not remove the character to the right. Please see the GIF animation.

<img width="954" height="254" alt="Image" src="https://github.com/user-attachments/assets/02a0dc47-b34f-4161-8f25-939d4482e61b" />

### What did you expect to happen?

Backspace deletes the character before the cursor, and Delete removes the character after the cursor.

### Steps to reproduce

1. input somthing and press enter. I doesn't matter what happens.
2. press Up Arrow to show the last command.
3. press Backspace. IT DOES NOT delete anything. It works just like Left Arrow

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #959 — Feature Request & Bug Report
- **标签**: bug
- **创建**: 2026-07-06  |  **更新**: 2026-07-06

### Terax version

0.8.2

### Operating system

Windows

### OS version

Windows 10 20H2

### What happened?

There are two issues:

1. The application does not have a sidebar navigation panel, making it less convenient to switch between different sections.

2. When using a Chinese IME, pressing the `Shift` key during text composition causes the current composing text to disappear instead of being converted to the corresponding English string.

### What did you expect to happen?

1. It would be great if the application could provide a sidebar navigation panel for easier navigation.

2. When pressing `Shift` during Chinese IME composition, the current composing text should be converted to the corresponding English string (or at least remain intact), matching the normal behavior of Windows text input controls.

### Steps to reproduce

1. Enable a Chinese IME (e.g. Microsoft Pinyin).
2. Open the application and focus on a text input field.
3. Type several Chinese characters without committing the composition.
4. Press the `Shift` key.
5. The composing text disappears.

### Logs / screenshots

No logs are available.

I can provide a screen recording or screenshots if needed.

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #951 — application loses reacton.
- **标签**: bug
- **创建**: 2026-07-05  |  **更新**: 2026-07-05

### Terax version

0.8.2

### Operating system

Windows

### OS version

win11 29613

### What happened?

If I missed clicking the button "approve" or "deny", and send some other questions, it will appear: 'something went wrong. An error occurred. Dismiss'. And nothing can go on.

### What did you expect to happen?

Please resolve this. Or I have to restart the application, and lost all my chat history.

### Steps to reproduce

1. the prompt appear: approved or deny
2. miss to click
3. input some other question
4. the error appears, and I can't click again

### Logs / screenshots

<img width="2560" height="1540" alt="Image" src="https://github.com/user-attachments/assets/c4aae346-fea8-4614-9fb9-85cd479fd9cb" />

### Before submitting

- [ ] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #941 — undo redo
- **标签**: bug
- **创建**: 2026-07-04  |  **更新**: 2026-07-04

### Terax version

0.8.2

### Operating system

macOS (Apple Silicon)

### OS version

Tahoe 26.5.2

### What happened?

when i use cmd+shift+z(redo), top panel with tabs and others just hide and unhide. cmd + z works fine!

### What did you expect to happen?

i expected redo

### Steps to reproduce

1. open terax
2. open .md file or any text file
3. make change
4. make undo(cmd+z)
5. make redo(cmd+shift+z)

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [ ] I am running the latest version (or this happens on `main`)

### #938 — Session error: message sent without clicking Confirm.
- **标签**: bug
- **创建**: 2026-07-04  |  **更新**: 2026-07-04

### Terax version

0.8.2

### Operating system

macOS (Apple Silicon)

### OS version

macos 26.5.1 Apple M5

### What happened?

<img width="2940" height="1724" alt="Image" src="https://github.com/user-attachments/assets/cae5caa9-26a0-46f0-8471-9e46f9ad5567" />

### What did you expect to happen?

1. no unexpected error
2. resume or fork session to continue

### Steps to reproduce

Session error: message sent without clicking Confirm.

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #933 — After installation on macOS 13.0.1, nothing appears on the screen when the application is opened.
- **标签**: bug
- **创建**: 2026-07-03  |  **更新**: 2026-07-03

### Terax version

0.8.2

### Operating system

macOS (Intel)

### OS version

macos 13.0.1

### What happened?

<img width="1417" height="804" alt="Image" src="https://github.com/user-attachments/assets/1ff7bf4b-0060-4947-99c8-87699c9032d1" />
After installation, when you open this interface, there is no content displayed? I know that my system version is relatively old, but I wonder if this problem is caused?

### What did you expect to happen?

fix the problem

### Steps to reproduce

macos 13.0.1
install & open it 

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #930 — 检测不到变量
- **标签**: bug
- **创建**: 2026-07-03  |  **更新**: 2026-07-03

### Terax version

0.8.2

### Operating system

Windows

### OS version

windows10

### What happened?

<img width="890" height="292" alt="Image" src="https://github.com/user-attachments/assets/2851aff6-71a5-4b74-b4b3-c61f6114416e" />



### What did you expect to happen?

安装完成后启动就是这样的
所有窗口都默认置顶，无中文设置

### Steps to reproduce

1、安装完成后，在命令窗口中显示：
检索不到变量“$global:__TERAX_HOOKS_LOADED”，因为未设置该变量。
所在位置 C:\Users\Administrator\.cache\terax\shell-integration\powershell\profile.ps1:6 字符: 5
+ if ($global:__TERAX_HOOKS_LOADED) { return }
+     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (global:__TERAX_HOOKS_LOADED:String) []，RuntimeException
    + FullyQualifiedErrorId : VariableIsUndefined
2、所有窗口默认置顶其他应用之上
3、无中文设置

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [ ] I am running the latest version (or this happens on `main`)

### #927 — german umlauts apears double
- **标签**: bug
- **创建**: 2026-07-02  |  **更新**: 2026-07-10

### Terax version

0.8.2

### Operating system

Linux

### OS version

Ubuntu24.04 Gnome Wayland

### What happened?

If I tye a german umlaut (äöü):
1. type: ö
2. type: ööö
3. type: öööööö
4. type: ....

### What did you expect to happen?

only one char after the first type

### Steps to reproduce

Open terax
type a german umlaut.

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #925 — NerdFonts
- **标签**: bug
- **创建**: 2026-07-02  |  **更新**: 2026-07-02

### Terax version

0.8

### Operating system

macOS (Apple Silicon)

### OS version

mac 26

### What happened?

Nerdfonts on p10k are not supported
Print with terax and iterm.

<img width="163" height="189" alt="Image" src="https://github.com/user-attachments/assets/f3b3fbc0-eb6f-4b80-9918-eaf5bc4d9ce1" />

### What did you expect to happen?

icons render proper

### Steps to reproduce

1 - open terax
2 - zsh with p10k prompt

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #909 — windows: The terminal has launched the Claude code, but Terax has not detected it.
- **标签**: bug
- **创建**: 2026-06-30  |  **更新**: 2026-07-03

### Terax version

0.8.2

### Operating system

Windows

### OS version

win11 24h2

### What happened?

The terminal has launched the Claude code, but Terax has not detected it.

<!-- Failed to upload "image.png" -->

### What did you expect to happen?

Terax should be able to know that my terminal has launched Claude Code.

### Steps to reproduce

just start claude code in  terminal (win powershell 7)

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #905 — Abnormal color rendering in Light Mode
- **标签**: bug
- **创建**: 2026-06-30  |  **更新**: 2026-06-30

### Terax version

0.8.2

### Operating system

Windows

### OS version

Windows 11 Latest

### What happened?

The theme inside Codex CLI rendered as Dark Mode while outside as Light Mode. User's input words are hardly visible. Codex's built-in theme picker didn't help.

### What did you expect to happen?

Theme should be synced all over the terminal.

### Steps to reproduce

1. Enable Light Mode in Settings.
2. Launch Codex CLI

### Logs / screenshots

<img width="1490" height="698" alt="Image" src="https://github.com/user-attachments/assets/51619b45-a89d-4db8-ae31-14ed1c25ba86" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #902 — An error aoccured
- **标签**: bug
- **创建**: 2026-06-29  |  **更新**: 2026-06-29

### Terax version

v0.8.2

### Operating system

macOS (Apple Silicon)

### OS version

macOS Tahoe 26.5

### What happened?

After connecting the AI-RPE keys for Gemini, OpenAI via GLM, or Anthropic keys, it took a few minutes. Since then, every provider either outputs something incorrect or generates error messages. I can't get anything to work, no matter which model I use.

### What did you expect to happen?

to work

### Steps to reproduce

give a promt in the ai chat window

### Logs / screenshots

<img width="430" height="209" alt="Image" src="https://github.com/user-attachments/assets/f05b0837-bc3c-4b1d-8ff5-1b86b26f4b03" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #886 — macOS: Title bar and window control icons are not vertically aligned
- **标签**: bug
- **创建**: 2026-06-27  |  **更新**: 2026-06-27

### Terax version

Version 0.8.2 (0.8.2)

### Operating system

macOS (Apple Silicon)

### OS version

macOS 26.5.1

### What happened?

The Terax app title bar/header area is visually misaligned on macOS Apple Silicon.

The close/minimize/maximize buttons, title bar controls, and header icons do not appear vertically centered on the same baseline. The issue is visible in the top-left/title bar area immediately after opening the app.

This looks like a UI layout/alignment issue rather than a functional crash, but it makes the desktop app header look broken/unpolished.

### What did you expect to happen?

The title bar, macOS window controls, app title/menu area, and header icons should be vertically centered and aligned consistently.

The controls should follow normal macOS title bar spacing/alignment and should not appear shifted or uneven.

### Steps to reproduce

1. Open Terax on macOS Apple Silicon.
2. Look at the top-left/title bar area of the app window.
3. Compare the alignment of the macOS window controls, app title/header controls, and icons.
4. Notice that the title/header icons are not vertically aligned properly.

### Logs / screenshots

<img width="173" height="74" alt="Image" src="https://github.com/user-attachments/assets/4f276b21-21a2-468c-93db-2f56e9d2ac4a" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #880 — Appearance Light/Dark not work with Claude Code
- **标签**: bug
- **创建**: 2026-06-26  |  **更新**: 2026-06-26

### Terax version

0.8.2

### Operating system

macOS (Apple Silicon)

### OS version

macOS 26.5.1

### What happened?

System: Dark mode
Terax apperance: Light
Claude Code theme: auto

When start claude code from terax -> claude code still receive dark theme
-> some text can't read 

Cmux work well

### What did you expect to happen?

Claude Code follow Terax apperance

### Steps to reproduce

Same as `What happened` section

### Logs / screenshots

Cmux

<img width="681" height="450" alt="Image" src="https://github.com/user-attachments/assets/58e07749-1447-4c1b-8e19-00455a42f90b" />

Terax

<img width="735" height="502" alt="Image" src="https://github.com/user-attachments/assets/f91b64bf-f7bb-4b2a-9cc1-030984bb3ed4" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #873 — Enter during IME composition submits the AI message instead of confirming the candidate (macOS)
- **标签**: bug
- **创建**: 2026-06-25  |  **更新**: 2026-06-25

### Terax version

0.8.2

### Operating system

macOS (Apple Silicon)

### OS version

macOS 26.5.1

### What happened?

On macOS, when typing Chinese into the AI chat input (the "Ask Terax" box) with an IME — system Pinyin/Bopomofo, or third-party ones like
 Sogou — pressing Enter to confirm an IME candidate sends the whole unfinished message right away, instead of committing the candidate text
 into the input. The composition never gets a chance to land as raw text first.

 This only happens on macOS. Windows and Linux are fine.

### What did you expect to happen?

Enter pressed while a candidate is still being composed should only commit the candidate into the input box (standard IME behavior). The
 message should only send once composition is finished and Enter is pressed again on a non-composing state.

### Steps to reproduce

1. On macOS, open Terax and switch to a Chinese IME (system Pinyin, etc.)
2. Focus the AI chat input ("Ask Terax")
3. Type pinyin so a candidate is showing but not yet confirmed (e.g. type nihao before picking 你好)
4. Press Enter to confirm the candidate
5. The entire message gets sent immediately and the input is cleared

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #872 — the expirence is too low
- **标签**: bug
- **创建**: 2026-06-25  |  **更新**: 2026-06-26

### Terax version

0.8.2-1

### Operating system

Linux

### OS version

linux

### What happened?

1.I use the opencode by this terminal, I found that the shortcut of the opencode cannot use.
2.the copy and paste cannot use the shortcut.
3.the last comand and next command  shortcut cannot define without the ctrl.
4.It's deficto to found out the model id  when add the ai provider.
5.the notifcication only support the claude code.
6.cannot connect to the remote server by the ssh and sftp like the vscode.

### What did you expect to happen?

I hope the developer can improve the expirence of the terminal.

### Steps to reproduce

none

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #863 — Background image does not get blurred when command palette is open
- **标签**: bug
- **创建**: 2026-06-23  |  **更新**: 2026-06-23

### Terax version

0.8.2

### Operating system

macOS (Apple Silicon)

### OS version

macOS Tahoe 26.5.1

### What happened?

When command palette is open UI gets blurred but the blur effect does not affect background image

### What did you expect to happen?

entire background including image and UI gets blurred

### Steps to reproduce

1. Set background image
2. Open `command palette` modal from the main screen

### Logs / screenshots

<img width="1294" height="828" alt="Image" src="https://github.com/user-attachments/assets/43336ed0-95f8-4aee-84df-21966ee22a50" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #857 — Potential Bug Report: First Keystroke Swallowed in Terminal on Windows
- **标签**: bug
- **创建**: 2026-06-23  |  **更新**: 2026-07-06

### Terax version

0.8.1

### Operating system

Windows

### OS version

Windows 11 25H2

### What happened?

On Windows, the first key typed into a terminal can be swallowed when the terminal is newly focused, newly opened, or the app window has just become active. The user sees the terminal, types a character, but that first character does not appear in the shell. Subsequent keystrokes work normally.

Potential root cause: the PTY write path appears correct and already queues input before the PTY is attached. The likely issue is a frontend focus race. xterm receives keyboard input through its hidden textarea, but during the first focus/activation frame the browser keydown event may target the window/body/pane container instead of xterm’s textarea. Because xterm never receives that first event, its onData handler does not fire, so nothing is sent to pty_write.

Relevant clue: new terminal slots are initially hidden and then focused after delayed rendering/RAF work. On Windows this creates a small window where the terminal looks active enough for the user to type, but xterm is not yet the actual keyboard target. Subsequent keys work because focus has landed by then.

### What did you expect to happen?

The first key typed into a terminal should worked normally.

### Steps to reproduce

1. Open Terax
2. Open a terminal (On windows, it's pwsh.exe v7 which I set for default terminal app)
3. Type in "dir", first 'd' swallowed

### Logs / screenshots

_No response_

### Before sub...(truncated)

### #852 — I was curious about Terax, but after actually trying it out, I felt there was still a significant gap.
- **标签**: bug
- **创建**: 2026-06-22  |  **更新**: 2026-06-22

### Terax version

0.8.1

### Operating system

Windows

### OS version

win 10

### What happened?

1. Can’t copy tags—like in Windows Terminal—which is mainly used for quickly copying and then performing operations based on the same path
2. I’ve looked for it several times but can’t find the scroll bar, so I can’t review previous logs—even with the default settings! This shouldn’t be the case.
3. When something is selected, the “Ask Terax” window automatically pops up. I don’t recommend this feature—it should be optional or able to be disabled. Also, I suggest adding the ability to right-click to copy and right-click to paste directly after selecting text.
4. In the default theme’s Dark Mode, the white text is too bright!
5. The left-side file tree pops up automatically when the app opens; I’d prefer it to be hidden by default.
Keep up the good work!

Translated with [DeepL.com](https://www.deepl.com/?utm_campaign=product&utm_source=web_translator&utm_medium=web&utm_content=copy_free_translation) (free version)

### What did you expect to happen?

See above.

### Steps to reproduce

See above.

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [ ] I am running the latest version (or this happens on `main`)

### #850 — he character 'ñ' duplicates incrementally on consecutive keystrokes
- **标签**: bug
- **创建**: 2026-06-22  |  **更新**: 2026-07-29

### Terax version

0.8.1

### Operating system

Linux

### OS version

Ubuntu 24.04.4 LTS x86_64

### What happened?

There is a strange rendering/input bug when typing the character 'ñ' in the Terax terminal. Instead of printing a single character per keystroke, it repeats the character incrementally based on how many times it has been pressed consecutively.

### What did you expect to happen?

I expected the terminal to print exactly one 'ñ' character per keystroke, just like any other standard character.

### Steps to reproduce

1. Open the Terax terminal.
2. Press the 'ñ' key once -> A single ñ appears.
3. Press the 'ñ' key a second time -> Two more ñ appear (resulting in ñññ total).
4. Press the 'ñ' key a third time -> Three more ñ appear (resulting in ññññññ total).

> Note: The behavior continues exponentially/incrementally with each subsequent press.

https://github.com/user-attachments/assets/bd8d13a7-031d-416c-bd53-0896ade40f58

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #846 — Consistent use of XML formatting, despite instruction not to do so
- **标签**: bug
- **创建**: 2026-06-21  |  **更新**: 2026-06-21

### Terax version

0.8.1

### Operating system

Windows

### OS version

Windows 11

### What happened?

When strictly defined not to use XML tool calling, it still used the incorrect formatting type. I am wondering if it's a problem with my locally hosted LLM (Qwen3.5 9B Q4_K_M, GGUF, served via Ollama connected via Granian interface). Below are some of the stuff I've done to try and fix the issue:

Custom instructions:
# Tool Calling & Execution Guardrails (Strict Enforcement)

# Host Environment Guardrails
- HOST OS: Windows 11
- DEFAULT SHELL: PowerShell (pwsh / powershell.exe)
- CRITICAL: You are strictly forbidden from executing Linux/Unix shell commands. Never use 'head', 'tail', 'grep', 'find', or forward slashes '/' in terminal executions. 
- If you need to list files, use native PowerShell commands like 'Get-ChildItem' or completely bypass the terminal and use native Terax tools like 'list_directory' or 'fs_search'.
- When invoking native Terax tools, you must always provide the fully qualified absolute Windows path string. Never leave the path parameter empty.

## 1. Tool Call Architecture
- You operate natively within Terax. You are strictly permitted to use only the registered workspace tools: `read_file`, `list_directory`, `fs_search`, and `fs_grep`.
- NEVER attempt to guess, hallucinate, or construct abstract/nested functions (such as `run_subagent`, `execute_script`, or `spawn_child`).
- If a custom file or document instruction (such as TERAX.md) mentions an e...(truncated)

### #845 — Windows: multiline paste auto-submits messages; voice-to-text input is not inserted
- **标签**: bug
- **创建**: 2026-06-21  |  **更新**: 2026-06-21

### Terax version

0.8.0

### Operating system

Windows

### OS version

Windows 10

### What happened?

There are two input-related issues on Windows:

Pasting text containing line breaks immediately submits the message after each newline instead of preserving the multiline text in the input box.
Voice-to-text tools (e.g. Handy) do not insert any text into the input box. It appears the dictated text is not being recognized as normal text input.

### What did you expect to happen?

Pasting multiline text should preserve line breaks without submitting the message.
Voice-to-text tools should insert text the same way as keyboard input or paste.
Messages should only be submitted when explicitly requested

### Steps to reproduce

Issue 1: Multiline paste auto-submits

Open Terax on Windows 10.
Copy text containing multiple lines.
Paste it into the input box.
Observe that each line break causes the message to be sent immediately.

Issue 2: Voice-to-text input is not inserted

Open Terax on Windows 10.
Use a voice-to-text tool such as Gandy.
Dictate text.
Observe that no text is inserted into the input box.

### Logs / screenshots

Related issues
#630 – WebGL terminal rendering issues preventing text input.
#633 – Windows-specific instability and voice-to-text being interpreted incorrectly.

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #844 — open in terax doesn't work
- **标签**: bug
- **创建**: 2026-06-21  |  **更新**: 2026-06-21

### Terax version

0.8.1

### Operating system

Windows

### OS version

Windows 11 x86

### What happened?

Right clicking in any directory gives  a option to "Open in Terax"
Clicking it doesn't open the address of that directory in terax like "Open in Terminal" works

### What did you expect to happen?

Clicking "Open in Terax" should open the directory in which "Open in Terax" is clicked just like "Open in Terminal" works

### Steps to reproduce

Open any file 
Right click
Open in Terax

### Logs / screenshots

Right click in Desktop

<img width="305" height="381" alt="Image" src="https://github.com/user-attachments/assets/68a9534f-b8b4-40fc-af85-af200dc5a559" />

Desktop Directory not opened

<img width="1919" height="1199" alt="Image" src="https://github.com/user-attachments/assets/bb96e4e7-ca93-4f9d-8cee-9c96d20dc813" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #826 — Garbage escape sequence output when running git status with delta pager
- **标签**: bug
- **创建**: 2026-06-19  |  **更新**: 2026-06-19

### Terax version

0.8.0

### Operating system

macOS (Apple Silicon)

### OS version

latest macOS and windows 11

### What happened?

When I run `git status` in a repo configured to use `delta` as the pager, I sometimes get this unexpected escape-sequence-like output mixed into the command output:

```text
/fbfb/fbfbESC\ESC]11;rgb:0909/0b0b/0c0cESC\
```

It looks like a raw ANSI/OSC escape sequence (possibly related to background color, OSC 11), printed literally instead of being interpreted by the terminal. [[youtrack.jetbrains](https://youtrack.jetbrains.com/projects/IJPL/issues/IJPL-218303/Support-OSC-11-escape-sequence-for-dynamic-terminal-background-colors)](https://youtrack.jetbrains.com/projects/IJPL/issues/IJPL-218303/Support-OSC-11-escape-sequence-for-dynamic-terminal-background-colors)

This did not happen before using Terax’s integrated terminal with my current Git/delta setup.

### What did you expect to happen?

I expected `git status` to show the normal Git status output with delta’s colorization only, without any raw escape sequences or extra characters printed.

### Steps to reproduce


1. Open Terax integrated terminal on macOS (Apple Silicon).  
2. Use a shell configured with Git and delta as pager (see minimal config below).  
3. Run:

   ```bash
   git status
   ```

4. Observe that the output sometimes includes a line similar to:

### Logs / screenshots

### Minimal related config

This is a reduced version of my `~/.gitconfig` with only relevant parts ...(truncated)

### #816 — Bug with deleted directory
- **标签**: bug
- **创建**: 2026-06-16  |  **更新**: 2026-06-17

### Terax version

0.8.0

### Operating system

Windows

### OS version

Windows 10 Version 10.0.19045 Build 19045

### What happened?

Whe using right click on a directory to "open with Terax" and then delete that directory, the app got stuck in the non-existing directory and can't find a way to restart it to the root dir.
Even after closing the app still remember the previous non-existing directory. Opening new tab doesn't help either.
Reinstalling the application without removing it first still doesn't fix.

The fix:
Completely uninstall the app with checked "delete all the data" and reinstalling fix the issue. 

### What did you expect to happen?

When the connected directory is non-exists, it should route back to a root/home directory.
If possible has an option to toggle if I want to remember the last active directories.

### Steps to reproduce

1. Open Terax using right click on a directory
2. delete the directory
3. the app is now unusable

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #814 — Bug when pushing code via Scource Control
- **标签**: bug
- **创建**: 2026-06-16  |  **更新**: 2026-06-16

### Terax version

0.8.0

### Operating system

Windows

### OS version

11, x64

### What happened?

<img width="647" height="423" alt="Image" src="https://github.com/user-attachments/assets/f3c683ff-9850-43bb-9921-e39b6d96b285" />
click select all to add the file for git add
but it shows this error
When I use git add . 
it works idk why and how

### What did you expect to happen?

to work like git add .

### Steps to reproduce


Happens randomly... normally when I delete some files 

### Logs / screenshots

Already pasted above

### Before submitting

- [ ] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #807 — Localhost:3000 not working in preview
- **标签**: bug
- **创建**: 2026-06-14  |  **更新**: 2026-06-15

### Terax version

0.8.0

### Operating system

macOS (Apple Silicon)

### OS version

macOS 26.5.2

### What happened?

when opening an Next.js app running on docker at localhost:3000, i see just a white page and nothing there but in docker logs i can see that some requests are being send on website refresh

### What did you expect to happen?

I expected to see the app, not white screen

### Steps to reproduce

<img width="2552" height="1407" alt="Image" src="https://github.com/user-attachments/assets/0ebadd49-5912-41c6-9dfa-aa1972f71a81" />

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [ ] I am running the latest version (or this happens on `main`)

### #794 — Ollama local LLM responses
- **标签**: bug
- **创建**: 2026-06-13  |  **更新**: 2026-06-13

### Terax version

0.8.0

### Operating system

macOS (Apple Silicon)

### OS version

macOS 26.5.1 (25F80)

### What happened?

<img width="494" height="658" alt="Image" src="https://github.com/user-attachments/assets/408d3f18-8bf5-46be-a688-66378779a230" />

### What did you expect to happen?

I was expecting to have a smooth conversation with the local LLM and start immediately with the security checkup.

### Steps to reproduce

1. Install a local LLM like qwen2.5-coder:14b
2. Finish setting up models and agents pages
3. Try to analyze the code in a repo by using Security agent (didnt use another agent though)

### Logs / screenshots

<img width="494" height="658" alt="Image" src="https://github.com/user-attachments/assets/5eafa7e0-d046-4ce4-b016-ab771652e8f9" />

<img width="696" height="717" alt="Image" src="https://github.com/user-attachments/assets/4af533b1-cc54-4a80-80ce-719b696156e9" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #781 — Mouse scroll wheel sends arrow keys to TUI apps instead of scrolling output
- **标签**: bug
- **创建**: 2026-06-11  |  **更新**: 2026-07-02

### Terax version

0.7.3

### Operating system

Windows

### OS version

11

### What happened?

Starting today, the mouse scroll wheel sends arrow keys (↑/↓) to fullscreen
TUI apps instead of emitting scroll events. Terax even shows a banner that
says: "Scroll wheel is sending arrow keys · use PgUp/PgDn to scroll".

This breaks scrolling inside Claude Code: instead of scrolling through the
model's output, the wheel navigates the conversation history (which is bound
to the arrow keys), because the arrow-key input lands on the wrong UI region.

I did not knowingly update anything — the behavior changed on its own today,
so it may have come in via an auto-update.

### What did you expect to happen?

The mouse wheel should scroll the active TUI's output (the model's response in
Claude Code), the way it did before today.

### Steps to reproduce

1. Open a WSL2 tab in Terax.
2. Launch Claude Code (`claude`).
3. Generate enough output to scroll.
4. Scroll up/down with the mouse wheel.

### Logs / screenshots

<img width="964" height="121" alt="Image" src="https://github.com/user-attachments/assets/cff90065-35ee-4671-b8a7-fa766bdb279f" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #749 — The sidebar cannot be used it redraws every 2 seconds
- **标签**: bug
- **创建**: 2026-06-07  |  **更新**: 2026-06-07

### Terax version

0.7.3

### Operating system

macOS (Apple Silicon)

### OS version

macOS 26.5.1

### What happened?

The site bar where file navigation is placed updates every 2 seconds, which causes it to scroll to the top each time and prevents navigating the files. You can scroll down a little, open some folders, then the update occurs and it jumps back up. When you try to scroll down again, it jumps up again, repeating every 2 seconds.

### What did you expect to happen?

Navigation should work properly. When I scroll down, the position where I am should be fixed. If I open a folder, drill down into the structure, and scroll down, I should remain where I am even if the navigation updates. The second point is that the navigation redraw should not happen so noticeably; otherwise you see the entire navigation flickering about every two seconds. 

### Steps to reproduce

You open TRX, then open the side sidebar and see, for example, you must find the project or go to the root of your computer. You will see a huge navigation tree on the left, then try scrolling down, and everything will be in front of you. 

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #743 — the terminal hardly shows any  thing on the screen while running codex
- **标签**: bug
- **创建**: 2026-06-06  |  **更新**: 2026-06-06

### Terax version

0.7.3

### Operating system

Linux

### OS version

ubuntu 24.04

### What happened?

while running codex in the terminal i hardly can see what happning on the screen , screen updates very late and just mixed up the out put spacialy when running /status 

### What did you expect to happen?

i want a snappy terminal , and be able to monitor whats going on

### Steps to reproduce

open terax and open codex and run /status or run a prompt 

### Logs / screenshots

[terax: dropped output during hibernation]



























• Running dart format 


### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #729 — AI agents not working
- **标签**: bug
- **创建**: 2026-06-05  |  **更新**: 2026-08-03

### Terax version

0.7.3

### Operating system

macOS (Apple Silicon)

### OS version

macOS Tahoe 26.4.1

### What happened?

<img width="629" height="550" alt="Image" src="https://github.com/user-attachments/assets/fe6f2161-183e-4feb-bea9-0e1e2d12b69a" />
I plugged in my Anthropic account through an API key and I get this error every time I try to speak with the agent.

### What did you expect to happen?

I expected the agent to reply

### Steps to reproduce

1. Open Terax
2. Go to Settings -> Models
3. Tap on "Add provider"
4. Add your Anthropic API Key
5. try to talk with an agent

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [ ] I am running the latest version (or this happens on `main`)

### #721 — Native context menu appears on right-click in terminal panes, blocking TUI apps' own right-click menus
- **标签**: bug
- **创建**: 2026-06-04  |  **更新**: 2026-06-04

### Terax version

0.7.3

### Operating system

macOS (Apple Silicon)

### OS version

macOS 26.3.1

### What happened?

Right-clicking inside a terminal pane shows the native WebKit/macOS context menu, even when the foreground TUI app has mouse reporting enabled. The right-click event IS forwarded to the app correctly (the TUI app's own right-click menu appears underneath), but Terax also draws its native context menu on top, so two menus overlap and the native one blocks the app's menu.

Concretely: I run herdr (a terminal multiplexer) in a Terax pane. herdr enables mouse capture (SGR mouse mode) and renders its own right-click pane menu. That menu does render, which confirms the click reaches the PTY - but the native macOS context menu appears over it and makes herdr's menu unusable.

Root cause looks like the terminal frontend forwards the right mouse button to the PTY but does not call event.preventDefault() on the contextmenu event, so the default WKWebView context menu still pops up. Native terminals (iTerm2, Warp, Apple Terminal) suppress their context menu while an app has mouse reporting active, so this works fine there.

### What did you expect to happen?

When the foreground app has mouse reporting / mouse mode enabled, Terax should suppress the native WKWebView context menu (call preventDefault() on contextmenu) and let the app handle the right-click, the same way iTerm2, Warp, and Apple Terminal do. Ideally also expose a setting like "Let terminal apps handle ri...(truncated)

### #702 — $PATH is not setup ideally
- **标签**: bug
- **创建**: 2026-06-03  |  **更新**: 2026-06-03

### Terax version

0.7.3

### Operating system

macOS (Apple Silicon)

### OS version

macOS 26.5

### What happened?

I cannot use my homebrew binaries from terax out of the box.

### What did you expect to happen?

I expected it to work as default terminal app.

### Steps to reproduce

1. Open Terax
2. Try to execute something installed from homebrew
3. It cannot find the binary

### Logs / screenshots

This is what default terminal app echoes $PATH:
/usr/local/bin /System/Cryptexes/App/usr/bin /usr/bin /bin /usr/sbin /sbin /var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin /var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin /var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin /pkg/env/global/bin /opt/homebrew/bin /home/pai/.local/bin /Users/pai/.rustup/toolchains/stable-aarch64-apple-darwin/bin

This is Terax:
/usr/bin /bin /usr/sbin /sbin /usr/local/bin /home/pai/.local/bin /Users/pai/.rustup/toolchains/stable-aarch64-apple-darwin/bin

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [ ] I am running the latest version (or this happens on `main`)

### #699 — [Bug] Cyrillic (Russian) input characters are duplicated and repeated when typing in terminal/agent
- **标签**: bug
- **创建**: 2026-06-03  |  **更新**: 2026-06-04

### Terax version

0.7.3

### Operating system

Linux

### OS version

Ubuntu 24.04

### What happened?

### Describe the bug
When typing in Russian (Cyrillic layout) inside the terminal tab or the agent input bar, the keyboard input behavior is broken. Instead of entering characters normally, previously typed character blocks/syllables are duplicated and appended repeatedly as I type. 

For example, trying to type words like `создай` or `продолжай` results in broken outputs like:
`соозозжожаозжайозжай созжай прозжай проозжай протозжай протсозжай протс`

### What did you expect to happen?

### Expected behavior
Cyrillic/Russian input should work normally, displaying each character exactly once as typed.

### Steps to reproduce

### Steps to reproduce
1. Open Terax AI.
2. Switch your OS keyboard layout to Russian (Cyrillic).
3. Open a terminal session (or focus the AI agent input box).
4. Start typing any Russian word.
5. Observe how characters are duplicated and repeat in a buggy sequence.

### Logs / screenshots

Here is a screenshot of the issue:

<img width="1630" height="432" alt="Image" src="https://github.com/user-attachments/assets/44a4594a-8870-432d-920b-653068280a24" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #687 — Opencode freezing
- **标签**: bug
- **创建**: 2026-06-02  |  **更新**: 2026-06-03

### Terax version

0.7.3

### Operating system

macOS (Apple Silicon)

### OS version

26.5

### What happened?

Sometimes, my OpenCode tab gets stuck and doesn’t work. Its interactive features, such as selecting text to copy, response streaming, loading icons, and so on, become inaccessible.

When I encounter this problem, I usually try switching to other tabs and then returning to OpenCode. Sometimes, it resolves itself in the first attempt, but other times, it’s not that straightforward. After about 20 attempts (or more), I eventually close the OpenCode session and reopen it, which is quite annoying.

### What did you expect to happen?

don't freezing :)

### Steps to reproduce

This issue is not permanent, so I’m not sure how to suggest reproducing guides. 

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #678 — App logo sits bigger than usual in macOS tab switcher
- **标签**: bug
- **创建**: 2026-06-02  |  **更新**: 2026-06-02

### Terax version

0.7.3

### Operating system

macOS (Apple Silicon)

### OS version

Sequoia 15.7.4

### What happened?

The app logo in the tab switcher (cmd+tab) in macOS sits larger than the usual app logo size.

### What did you expect to happen?

Reduce the app logo size to the regular size for macOS

### Steps to reproduce

1. Open terax on macos
2. press cmd+tab to open the tab switcher

### Logs / screenshots

https://github.com/user-attachments/assets/105c5bf5-66f5-4d92-b3c0-2a87e7be5f64

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #674 — Display issue after using coding agents
- **标签**: bug
- **创建**: 2026-06-01  |  **更新**: 2026-06-01

### Terax version

0.6.6

### Operating system

macOS (Apple Silicon)

### OS version

macOS 14.3

### What happened?

After using for a while, especially running some coding agents with repeated rendering and interactions, the display's broken.

### What did you expect to happen?

It should be consistently rendered the content.

### Steps to reproduce

No guarantee, but very likely (I used two MacBook and encountered the same issue):
 - Open claude code or codex
 - Use it for a while

### Logs / screenshots

<img width="957" height="701" alt="Image" src="https://github.com/user-attachments/assets/b1df0bcf-76aa-4945-b68d-27009c650358" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #672 — Composer AI agent returns "Failed to fetch" on Windows with Anthropic provider
- **标签**: bug
- **创建**: 2026-06-01  |  **更新**: 2026-06-01

### Terax version

0.7.3

### Operating system

Windows

### OS version

Windows 10 64 bits

### What happened?

- Windows 10/11
- v0.7.3
- Anthropic API key configurada, aparece "Connected"
- Composer retorna "Failed to fetch" en cualquier mensaje
- Red funciona correctamente (curl a api.anthropic.com responde)

### What did you expect to happen?

The composer should send the message to the Anthropic API and return a response from the AI agent.

### Steps to reproduce

1. Open Terax on Windows 10
2. Go to Settings → Models → Add Anthropic API key (shows "Connected")
3. Open composer with Ctrl+I
4. Type any message and send
5. Error "Something went wrong. Failed to fetch" appears immediately

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #667 — Traffic light controls are slightly misaligned with sidebar icons
- **标签**: bug
- **创建**: 2026-06-01  |  **更新**: 2026-06-02

### Terax version

0.7.3 

### Operating system

macOS (Apple Silicon)

### OS version

Tahoe 26.5 

### What happened?

The macOS traffic light controls look slightly misaligned compared to the sidebar header icons.

I tested a small local adjustment, and aligning them to the same visual center makes the top bar feel cleaner.

### What did you expect to happen?

The traffic light controls should be vertically centered with the sidebar header icons.

### Steps to reproduce

Open Terax on macOS.

Look at the top left window controls and compare them with the sidebar header icons.

### Logs / screenshots

I forked your repository and changed the traffic light alignment so that it looks good. As a designer myself, I find the current alignment quite irritating. However, I am not a professional contributor or developer, so I trust you to handle the development aspects better than I can. I just fixed the traffic light icon alignment. 

<img width="409" height="197" alt="Image" src="https://github.com/user-attachments/assets/f2be50a9-28e1-4676-974a-d3f82ac073ff" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [ ] I am running the latest version (or this happens on `main`)

### #659 — Pressing cmd/ctrl + w on a Preview tab closes the whole terminal and loses the Tab sessions entirely.
- **标签**: bug
- **创建**: 2026-06-01  |  **更新**: 2026-06-08

### Terax version

0.7.3

### Operating system

macOS (Apple Silicon)

### OS version

macOS 26.3

### What happened?

Pressing cmd/ctrl + w on a Preview tab closes the whole terminal and loses the Tab sessions entirely.

### What did you expect to happen?

That it only closes that single specific tab that I was in. And also the tabs are persistent after reopening.

### Steps to reproduce

1. Open Terax.
2. Open a new Preview tab.
3. Press cmd/ctrl + w to close that specific tab.
4. Whole terminal closes.
5. Open Terax again.
6. Loses all Tab sessions.

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #634 — comman failed pnpm tauri build
- **标签**: bug
- **创建**: 2026-05-31  |  **更新**: 2026-05-31

### Terax version

0.5.9

### Operating system

Linux

### OS version

Ubuntu 24.04

### What happened?



that should be more controlled this cross platform. I'm gonna try to repair that...
but in general it's more an underlying problem of architecture. Patching the error doesn't necessary mean that it will work on everyone's computer. It's much better to use docker for dev, build. 

### What did you expect to happen?

just to build

### Steps to reproduce

complicated to reproduce, it's a problem of crossing platforms

### Logs / screenshots

error: failed to run custom build command for `gdk-sys v0.18.2`

Caused by:
  process didn't exit successfully: `/home/dlesieur/Documents/terax-ai/src-tauri/target/release/build/gdk-sys-3adb758b8883eb41/build-script-build` (exit status: 1)
  --- stdout
  cargo:rerun-if-env-changed=GDK_3.0_NO_PKG_CONFIG
  cargo:rerun-if-env-changed=PKG_CONFIG_x86_64-unknown-linux-gnu
  cargo:rerun-if-env-changed=PKG_CONFIG_x86_64_unknown_linux_gnu
  cargo:rerun-if-env-changed=HOST_PKG_CONFIG
  cargo:rerun-if-env-changed=PKG_CONFIG
  cargo:rerun-if-env-changed=PKG_CONFIG_PATH_x86_64-unknown-linux-gnu
  cargo:rerun-if-env-changed=PKG_CONFIG_PATH_x86_64_unknown_linux_gnu
  cargo:rerun-if-env-changed=HOST_PKG_CONFIG_PATH
  cargo:rerun-if-env-changed=PKG_CONFIG_PATH
  cargo:rerun-if-env-changed=PKG_CONFIG_LIBDIR_x86_64-unknown-linux-gnu
  cargo:rerun-if-env-changed=PKG_CONFIG_LIBDIR_x86_64_unknown_linux_gnu
  cargo:rerun-if-env-changed=HOST_PKG_CONFIG_LIBDIR...(truncated)

### #633 — Windows Terax behaviour much less unstable than Mac Terax (with WSL)
- **标签**: bug
- **创建**: 2026-05-31  |  **更新**: 2026-05-31

### Terax version

0.7.3

### Operating system

Windows

### OS version

win11 

### What happened?

Issues after moving from terax mac to terax win:
- Copying and pasting sometimes gets stuck and doesn't paste the code into the terminal.
- Cannot really delete folders in the UI 
- Having weird issues rendering different UI elements 
- Voice to text directly in the box for some reason does not work. It thinks it's being pasted an image for some reason. 
-  Generally, every few minutes, something that's supposed to work simply does not, and that was unexpected since it kind of worked well in Mac. 

### What did you expect to happen?

To be in parity with Mac.

### Steps to reproduce

use it in windows env. simple. 

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #630 — windows: when web-gl on terminal does not render. no ability to insert text
- **标签**: bug
- **创建**: 2026-05-31  |  **更新**: 2026-05-31

### Terax version

0.7.3

### Operating system

Windows

### OS version

win11 latest updates

### What happened?

i used the on mac. switched to pc and realized it does not work. no text is being added to screen. when disabled web gl in settings suddenly it works. so severity is high. 

### What did you expect to happen?

to be able to click in terminal and add text. 

### Steps to reproduce

windows. install. switched to WSL ubuntu linux subsystem - no way to add text.

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #619 — Voice-to-text flow in Codex CLI triggers image paste error
- **标签**: bug
- **创建**: 2026-05-31  |  **更新**: 2026-05-31

### Terax version

0.7.3

### Operating system

Windows

### OS version

windows 11 25H2

### What happened?

Bug: Voice-to-text flow in Codex CLI triggers image paste error


When trying to use voice-to-text in Codex CLI (inside Terax), the input fails and shows:

`Failed to paste image: no image on clipboard: The clipboard contents were not available in the requested format or the clipboard is empty.`



### What did you expect to happen?

Voice-to-text result should appear as normal text in the CLI input box.

### Steps to reproduce

1. Open Terax.
2. Open terminal and start Codex CLI.
3. Attempt to use voice-to-text for prompt input.
4. Paste/submit voice-generated input (or use normal paste shortcut during that flow).

### Logs / screenshots

<img width="1092" height="157" alt="Image" src="https://github.com/user-attachments/assets/df5e4535-7897-408e-ae4f-98d80ea18f03" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #615 — Startup error: bundled libpcre2 version mismatch + rustup proxy conflict on systems with rustup installed
- **标签**: bug
- **创建**: 2026-05-31  |  **更新**: 2026-05-31

### Terax version

0.7.3

### Operating system

Linux

### OS version

Arch Linux (AUR package `terax-ai-bin`)

### What happened?

On every startup, the following errors appear inside the Terax terminal window:

```
/usr/bin/terax: /tmp/.mount_teraxamKcnA/usr/lib/libpcre2-8.so.0: no version information available (required by /usr/bin/terax)
error: unknown proxy name: 'terax'; valid proxy names are 'rustc', 'rustdoc', 'cargo', 'rust-lldb', 'rust-gdb', 'rust-gdbgui', 'rls', 'cargo-clippy', 'clippy-driver', 'cargo-miri', 'rust-analyzer', 'rustfmt', 'cargo-fmt'
```

Two separate issues:

1. The AppImage bundles its own `usr/lib/libpcre2-8.so.0` compiled without version symbols, causing a linker warning on every launch.
2. Something inside the app invokes a binary named `terax` via bare name (no absolute path), which on systems with `rustup` installed gets intercepted by rustup's proxy dispatcher — rustup doesn't recognize `terax` as a valid proxy name and prints the error.

The app opens and functions normally despite the errors. They are cosmetic but noisy.

### What did you expect to happen?

Clean startup with no errors printed inside the terminal.

### Steps to reproduce

1. Install `terax-ai-bin` from AUR on Arch Linux with `rustup` installed
2. Launch Terax
3. Errors appear immediately inside the terminal on startup

### Logs / screenshots

```
/usr/bin/terax: /tmp/.mount_teraxamKcnA/usr/lib/libpcre2-8.so.0: no version information available (required by /usr/bin/terax)
err...(truncated)

### #609 — terax 0.7.3 UI issues
- **标签**: bug
- **创建**: 2026-05-31  |  **更新**: 2026-05-31

### Terax version

0.7.3

### Operating system

macOS (Apple Silicon)

### OS version

macOS 26.5 (25F71)

### What happened?

1.
max/full/hide button are not aligned with the rest: 

<img width="200" height="44" alt="Image" src="https://github.com/user-attachments/assets/1a5e7c0b-3b65-466d-81a6-b949faec7567" />

2. 
tabs do not respect close command by middle button of the mouse. expected: hover tab + middle button click = tab closed. in reality, it does not. same works for other native apps. 

3.
provider list does not offer to wrap calude code cli (like tolaria and other) and as max user - we no longer have api keys sadly. 

### What did you expect to happen?

1. The window controls (max / full / hide) should be visually aligned with the rest of the toolbar.
2. Middle-clicking a tab should close it, matching the behavior of other native apps (hover tab + middle-button click = tab closed).
3. As a feature request: for Claude Max users, it would be great to optionally wrap the local Claude Code CLI (with its skills and agents) instead of requiring an API key, since API plans aren't affordable for everyone. Thanks for considering this!

### Steps to reproduce

1. Open Terax 0.7.3 on macOS.
2. Observe the window controls (max / full / hide) in the title bar — they appear misaligned with the rest of the toolbar.
3. Hover over a tab and middle-click it — the tab does not close as expected.

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing i...(truncated)

### #592 — Terminal Freezes Completely When Tab Loses Focus During Coding Agent Sessions
- **标签**: bug
- **创建**: 2026-05-30  |  **更新**: 2026-05-30

### Terax version

0.7.3

### Operating system

Windows

### OS version

Windows 11 25H2

### What happened?

During long coding agent sessions (e.g., running Claude Code, Codex, or similar CLI agents in the Terax terminal), the entire terminal pane freezes completely whenever the tab loses focus or the terminal is left idle for a short period of time.

Once the freeze occurs:
- Arrow keys (Up/Down) stop responding — cannot navigate command history
- The Enter key does not work — cannot send Ctrl+C to interrupt/terminate the agent
- The terminal becomes completely unresponsive and blank
- The only recovery option is to close the terminal and open a brand new one, then re-launch the coding agent and resume the session from scratch

This is a critical regression introduced in a recent version of Terax. It happens consistently and repeatedly during normal multi-tab development workflows where focus is frequently switched between panes and tabs.

### What did you expect to happen?

The terminal should remain fully responsive and interactive at all times — even after losing focus, switching tabs, or being idle. Keyboard inputs (arrow keys, Enter, Ctrl+C) should continue to work normally when focus is returned to the terminal, allowing the user to interact with or terminate any running coding agent without needing to open a new terminal.

### Steps to reproduce

1. Open Terax v0.7.3 on Windows 11 25H2
2. Open a terminal pane and start a long-running coding agent session (e.g., Clau...(truncated)

### #584 — Launch Error On Manjaro Linux - Error 71 (Protocol Error) Dispatching To Wayland Display
- **标签**: bug
- **创建**: 2026-05-30  |  **更新**: 2026-07-04

### Terax version

0.7.3

### Operating system

Linux

### OS version

6.18.33-1-MANJARO (64-bit)

### What happened?

I can't run Terax AI at all on Manjro Linux KDE.

```bash
❯ terax
Gdk-Message: 14:08:00.063: Error 71 (Protocol error) dispatching to Wayland display.
```

### What did you expect to happen?

To be able to run it.

### Steps to reproduce

1. Open the terminal and type: `terax`.
2. The error will show up!

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #573 — hibernation clears claude code output
- **标签**: bug
- **创建**: 2026-05-29  |  **更新**: 2026-05-30

### Terax version

0.7.3

### Operating system

macOS (Apple Silicon)

### OS version

MacOS 26.5 (25F71)

### What happened?

1. open Terex
2. start a claude code session
3. open new tab and start a new claude code session
4. wait a bit and switch to first tab 

no claude output shows

### What did you expect to happen?

claude output should be showing

### Steps to reproduce

1. open Terex
2. start a claude code session
3. open new tab and start a new claude code session
4. wait a bit and switch to first tab - no output shows

### Logs / screenshots

<img width="1130" height="278" alt="Image" src="https://github.com/user-attachments/assets/f7264396-46f1-400e-9bad-3c26dca312ba" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #566 — Bug: Explorer Sidebar Cannot Access D:\ Drive on Windows While Terminal Works
- **标签**: bug
- **创建**: 2026-05-28  |  **更新**: 2026-05-28

### Terax version

Terax version: v0.7.3

### Operating system

Windows

### OS version

OS: Windows 11

### What happened?

The sidebar file explorer cannot access certain folders/drives and shows:

Access is denied. (os error 5)

The D:\ drive is inaccessible from the explorer UI.

However, the integrated terminal works correctly.

### What did you expect to happen?

Expected Behavior

Explorer sidebar should access the same filesystem paths available in terminal.

Actual Behavior

Explorer UI fails while terminal access succeeds.

### Steps to reproduce

Reproduction Steps
- Open Terax
- Try navigating to D:\ from sidebar explorer
- Explorer fails or does not display contents
- Open integrated terminal
- Run:
cd D:\
+ Then Terminal successfully changes directory and filesystem access works normally

### Logs / screenshots

<img width="1919" height="1079" alt="Image" src="https://github.com/user-attachments/assets/a2ca4296-2435-467c-9cb3-1806209475de" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #539 — FAQ Questions are not fully opening on Terax.app website
- **标签**: bug
- **创建**: 2026-05-26  |  **更新**: 2026-05-26

### Terax version

website

### Operating system

macOS (Apple Silicon)

### OS version

website

### What happened?

So, when you open any FAQ question from the website, the response opens slightly (1 row) and then stops.

<img width="808" height="428" alt="Image" src="https://github.com/user-attachments/assets/864529f5-91bc-4ce7-8d6e-b785753a395c" />

### What did you expect to happen?

open cully

### Steps to reproduce

1. Open Terax Website
2. Try to open FAQ

### Logs / screenshots

<img width="808" height="428" alt="Image" src="https://github.com/user-attachments/assets/70c3d2e3-69c7-4d2e-b3cf-48b6fbda9b62" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #526 — zsh: Terax sets ZDOTDIR to shell-integration dir; user .zshenv that loads $ZDOTDIR/conf.d/*.zsh errors (nomatch)
- **标签**: bug
- **创建**: 2026-05-26  |  **更新**: 2026-05-30

### Terax version

0.7.3

### Operating system

Linux

### OS version

Arch Linux 7.0.9-arch2-1

### What happened?

## Summary
When Terax launches zsh, it sets `ZDOTDIR=$HOME/.cache/terax/shell-integration/zsh`. My personal zsh config expects `conf.d/*.zsh` under `$ZDOTDIR` and uses a glob in `.zshenv`. In Terax’s integration directory there is no `conf.d` (and/or no `*.zsh`), so zsh errors with `no matches found` (nomatch).

This only happens in Terax; my normal terminal works.

## Environment
- OS: Arch Linux
- Shell: zsh
- My zsh config dir: `~/.config/zsh`

## Error shown

/home/kelvin/.config/zsh/.zshenv:14: no matches found: /home/kelvin/.cache/terax/shell-integration/zsh/conf.d/*.zsh

### What did you expect to happen?

## My ~/.config/zsh/.zshenv snippet
```zsh
for file in "${ZDOTDIR:-$HOME/.config/zsh}/conf.d/"*.zsh; do
  [ -r "$file" ] && source "$file"
done
```

## Why I think this happens
Terax sets `ZDOTDIR` to its integration directory (so zsh reads Terax-generated `.zshenv/.zprofile/.zshrc/.zlogin` from there). That makes my config resolve `conf.d/*.zsh` under Terax’s integration dir instead of `~/.config/zsh`.

## Expected
Terax should avoid causing zsh to error on startup for common dotfile patterns that reference `$ZDOTDIR`.

### Steps to reproduce

1. Install Terax (`crynta/terax-ai`) and configure your zsh dotfiles to live under `~/.config/zsh` with a modular `conf.d` layout.
2. In `~/.config/zsh/.zshenv`, add a `conf.d` loader that uses `$ZDOTDIR`, e.g.:...(truncated)

### #514 — Chat gets stuck when a follow-up prompt is sent on pending tool call
- **标签**: bug
- **创建**: 2026-05-25  |  **更新**: 2026-05-28

### Terax version

0.7.3

### Operating system

Linux

### OS version

Kubuntu 26.04

### What happened?

If a tool call's approval/rejection is pending, and a follow-up prompt is done, the AI agent gives an error about a missing tool call result. Clicking on the deny/approve button doesn't work now. Any number of follow-up prompts don't work after this and keep returning the error.

### What did you expect to happen?

The AI Agent may not accept inputs until the agent's current loop is complete, or perhaps the agent skips the pending tool call and gets steered by the follow-up prompts.

### Steps to reproduce

1. Open Terax
2. Start a new chat
3. Prompt it to do a tool call (e.g. run a command to check system logs for issues)
4. The AI Agent should now ask for permission to make the tool call  (tool call to run the command in the step 2 example).
5. Instead of accepting or rejecting the command, do a follow-up prompt
6. The error "Tool resultt is missing for tool call [tool call id]" should appear
7. Any follow-up prompts don't work and keep returning the above message.

### Logs / screenshots

Adding screenshots of the issue below

---
<img width="533" height="678" alt="Image" src="https://github.com/user-attachments/assets/9d13335f-5432-4499-871d-f84a254a0890" />

---
<img width="540" height="669" alt="Image" src="https://github.com/user-attachments/assets/7e7272f0-7e88-433c-9456-898f8412ec1b" />

### Before submitting

- [x] I searched existing issues and didn't find a du...(truncated)

### #508 — Agent unable to view images
- **标签**: bug
- **创建**: 2026-05-25  |  **更新**: 2026-05-25

### Terax version

0.7.3

### Operating system

Linux

### OS version

Fedora 44 (using RPM package)

### What happened?

When trying to attach an image to agent chat, I get an error:

<img width="555" height="137" alt="Image" src="https://github.com/user-attachments/assets/ff824b74-a4a2-41bb-b6ea-ae464be8c3ff" />

Can provide logs if needed - im not sure if this is expected? I checked the issues and cannot find one similar.

### What did you expect to happen?

The model is capable of seeing images - tested on my llama.cpp server that is used by the agent

### Steps to reproduce

1. open terax
2. attach an image to the chat
3. error will pop up on message send

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #502 — Model default to Opus 4 from Anthropic ?
- **标签**: bug
- **创建**: 2026-05-25  |  **更新**: 2026-05-25

### Terax version

0.7.3

### Operating system

Linux

### OS version

CachyOS - Kernel 7.0.1

### What happened?

Hello, I've tried to add my OpenCode Go subscription as an OpenAI Compatible provider but when I ask the agent what model it is it says its Claude Opus 4 from Anthropic ... Also there is no way of selecting the model ? I can put a list of model ids when adding a provider but I cannot select the model afterward ... Please fix this ASAP because it's not usable right now like that ...

### What did you expect to happen?

Select my model to use my subscription as provider.

### Steps to reproduce

1. Open terax
2. Configure a provider (OpenAI Compatible)
3. Start chatting and ask what model it is ?
4. Agent reply by saying its Claude Opus 4 from Anthropic ...

### Logs / screenshots

<img width="565" height="772" alt="Image" src="https://github.com/user-attachments/assets/c0eacccb-1273-4369-bdc0-846abcb98742" />

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #487 — Can't resize window
- **标签**: bug
- **创建**: 2026-05-25  |  **更新**: 2026-05-30

### Terax version

0.7.1

### Operating system

Linux

### OS version

Ubuntu 24.04 KDE 6

### What happened?

Just downloaded the .deb file.  It installed and started fine.  However I can't resize the app window at all.   Mouse cursor does not sense edges of windows and can't resize in any direction.  Running KDE Plasma 6 on Ubuntu 24.04

### What did you expect to happen?

be able to resize the window like any other app

### Steps to reproduce

1. Open Terax
2. Try to resize in any direction

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #449 — Bug: New tab hangs indefinitely when current directory is on external drive (macOS)
- **标签**: bug
- **创建**: 2026-05-23  |  **更新**: 2026-05-23

### Terax version

0.7.1

### Operating system

macOS (Apple Silicon)

### OS version

macos 26.3.1

### What happened?

When the current working directory is located on an external drive, opening a new tab with Cmd + T causes the new tab to hang indefinitely and never load.
The issue only occurs for projects stored on an external disk. Opening new tabs works normally when the project is located on the internal macOS drive.

### What did you expect to happen?

A new terminal tab should open normally in the same working directory, regardless of whether the project is stored on the internal disk or on an external drive.

### Steps to reproduce

1. Connect an external drive to a macOS machine
2. Open Terax AI
3. Navigate to a project stored on the external drive
4. Press Cmd + T to open a new tab
5. Observe that the new tab never finishes loading

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #448 — Terminal fails to initialize on launch and becomes unresponsive after pane split
- **标签**: bug
- **创建**: 2026-05-23  |  **更新**: 2026-05-30

### Terax version

0.7.1

### Operating system

Windows

### OS version

Windows 11 25H2

### What happened?

Two related terminal bugs:

**Bug 1: Terminal blank screen on open (intermittent)**
When opening the terminal, it frequently fails to load properly. The terminal shows a completely blank screen — no directory prompt is displayed and it is impossible to type anything. The terminal is entirely unresponsive. This does not happen 100% of the time; sometimes the terminal loads correctly and sometimes it doesn't, making it an intermittent/flaky bug.

**Bug 2: Terminal glitches out after horizontal or vertical pane split**
When splitting the terminal pane (either horizontally or vertically), the new terminal pane becomes completely glitched — nothing is displayed and it is impossible to type or interact with it in any way. The only workaround is to close the entire terminal window and open a fresh one, which causes loss of all terminal context, running processes, and session history, requiring the user to manually re-set up their workspace from scratch.

### What did you expect to happen?

1. When opening the terminal, it should always load correctly — displaying the current working directory prompt and allowing the user to type commands immediately.

2. When splitting the terminal pane horizontally or vertically, the new pane should open a fully functional terminal session without any glitching, blank screens, or unresponsive input.

### Steps to reproduce

**Bug 1: Termina...(truncated)

### #426 — Certificates on HTTPS OpenAI compatible endpoints
- **标签**: bug
- **创建**: 2026-05-22  |  **更新**: 2026-05-22

### Terax version

0.7.1

### Operating system

Linux

### OS version

Debian 12

### What happened?

When creating a provider for an OpenAI compatible endpoints i can't connect to the server because i can't point to my https certificates

### What did you expect to happen?

Being able to add the path the my certificates to be able to connect

### Steps to reproduce

1. Add OpenAI compatible provider with https certificates
2. Test prints Could not reach server

### Logs / screenshots

No debug in the terminal

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #424 — Doesnt launch on Cachy os (Arch, kde wayland)
- **标签**: bug
- **创建**: 2026-05-22  |  **更新**: 2026-05-27

### Terax version

0.5.9

### Operating system

Linux

### OS version

Operating System: CachyOS Linux  KDE Plasma Version: 6.6.5 KDE Frameworks Version: 6.26.0 Qt Version: 6.11.1 Kernel Version: 7.0.9-1-cachyos (64-bit) Graphics Platform: Wayland Processors: 12 × 11th Gen Intel® Core™ i5-11400F @ 2.60GHz Memory: 16 GiB of RAM (15,5 GiB usable) Graphics Processor: NVIDIA GeForce RTX 2060 SUPER Manufacturer: Micro-Star International Co., Ltd. Product Name: MS-7D18 System Version: 1.0

### What happened?

<img width="734" height="91" alt="Image" src="https://github.com/user-attachments/assets/b151efc1-5093-456d-867e-ee3bea8eef2c" />

### What did you expect to happen?

it should launch

### Steps to reproduce

1. download terax with yay -S terax-bin
2. open terax

### Logs / screenshots

_No response_

### Before submitting

- [x] I searched existing issues and didn't find a duplicate
- [x] I am running the latest version (or this happens on `main`)

### #422 — Cannot launch on Ubuntu with .AppImage build
- **标签**: bug
- **创建**: 2026-05-22  |  **更新**: 2026-07-17

### Terax version

0.7.1

### Operating system

Linux

### OS version

Ubuntu 26.04

### What happened?

it doesn't run on linux. message:

❯ ~/Apps/Terax_0.7.1_amd64.AppImage
/usr/lib/x86_64-linux-gnu/gvfs/libgvfscommon.so: undefined symbol: g_task_set_static_name
Failed to load module: /usr/lib/x86_64-linux-gnu/gio/modules/libgvfsdbus.so
/usr/lib/x86_64-linux-gnu/gvfs/libgvfscommon.so: undefined symbol: g_task_set_static_name
Failed to load module: /usr/lib/x86_64-linux-gnu/gio/modules/libgvfsdbus.so
/usr/lib/x86_64-linux-gnu/gvfs/libgvfscommon.so: undefined symbol: g_task_set_static_name
Failed to load module: /usr/lib/x86_64-linux-gnu/gio/modules/libgvfsdbus.so
Could not create default EGL display: EGL_BAD_PARAMETER. Aborting...
^C



### What did you expect to happen?

it should launch

### Steps to reproduce

launch Terax_0.7.1_amd64.AppImage

fail with messages:
❯ ~/Apps/Terax_0.7.1_amd64.AppImage
/usr/lib/x86_64-linux-gnu/gvfs/libgvfscommon.so: undefined symbol: g_task_set_static_name
Failed to load module: /usr/lib/x86_64-linux-gnu/gio/modules/libgvfsdbus.so
/usr/lib/x86_64-linux-gnu/gvfs/libgvfscommon.so: undefined symbol: g_task_set_static_name
Failed to load module: /usr/lib/x86_64-linux-gnu/gio/modules/libgvfsdbus.so
/usr/lib/x86_64-linux-gnu/gvfs/libgvfscommon.so: undefined symbol: g_task_set_static_name
Failed to load module: /usr/lib/x86_64-linux-gnu/gio/modules/libgvfsdbus.so
Could not create default EGL display: EGL_BAD_PARAMETER. Aborting...
^C


### Logs /...(truncated)

## 二、无标签 Issue（功能/请求/讨论）

### #1170 — Multi-select files in the sidebar (Cmd/Ctrl+click, Shift+click) + drag multiple files to move
- **创建**: 2026-08-25  |  **更新**: 2026-08-25

### What problem does this solve?

The sidebar file explorer only supports selecting one file at a time today — there's no way to Cmd+click or Shift+click to build a multi-selection. That means moving several files into another folder means dragging them one at a time, and there's no way to act on several files at once (e.g. delete a batch) either.

### Proposed solution

- Cmd+click (Ctrl+click on Windows/Linux) toggles a file in/out of the current selection — matches native Finder/Explorer conventions.
- Shift+click selects a contiguous range from the last-clicked row.
- Dragging any row that's part of the current multi-selection onto a folder moves the whole selection at once. (Single-file drag-to-move already works today — this extends it.)
- If a file being moved collides with an exis...

### #1168 — Chinese character rendering issues (garbled text/overlapping glyphs)
- **创建**: 2026-08-23  |  **更新**: 2026-08-23

## Bug Report: Chinese Character Rendering Issues (Garbled Text/Overlapping Glyphs)

**Environment:**
- Terax version: 0.8.6
- OS: macOS (Darwin 25.5.0)
- Shell: zsh

**Problem:**
Chinese characters are frequently rendered incorrectly in the terminal, showing:
- Garbled/corrupted glyphs
- Overlapping characters
- Random character substitutions
- Mixed correct/incorrect rendering within the same line

**Screenshot:**
(Attached: shows text like "同恒改了两筹项数勘礼" with various rendering artifacts)

**Example of affected text:**
```
7-14, 同恒改了两筹项数勘礼（"P0全部检沿（6项）"、"人衍检沿 P0 第 5-6 项"）
- 制工##.md 邮椐号 + 文漏清零条目
- ㄅNG9##G.md 新增 v0.7.16, 后 H3 暂不同恒的理由椐 4 条 n=0 待验假长
```

**Reproduction:**
- Occurs consistently when viewing/editing Chinese markdown files
- Happens across multiple sessions
- Does not appear to be...

### #1167 — Keyboard input duplicates exponentially (1,2,4,8...) on native Wayland, fixed by forcing XWayland
- **创建**: 2026-08-22  |  **更新**: 2026-08-22

## Summary

On native Wayland, every keystroke in Terax gets duplicated, and the duplication count doubles with each subsequent keystroke: the 1st keypress produces 1 character, the 2nd produces 2, the 3rd produces 4, the 4th produces 8, etc. This reproduces in **both** the terminal (PTY) and the separate AI chat text input, so it isn't scoped to the terminal/xterm.js input path specifically — it looks like a window/seat-level keyboard event handling bug.

## Environment

- Terax version: 0.8.6 (RPM build)
- OS: Fedora, Wayland session (`XDG_SESSION_TYPE=wayland`)
- `autocompleteEnabled` and `terminalWebglEnabled` both toggled off — doubling persists regardless, ruling those features out.

## Reproduction

1. Launch Terax normally on a Wayland session.
2. Open a terminal tab (or the AI cha...

### #1156 — Crash (silent process exit) switching workspace from WSL back to Local — regression of #356
- **创建**: 2026-08-20  |  **更新**: 2026-08-20

## Environment

- **Terax**: 0.8.6 (Windows x64)
- **OS**: Windows 11 Pro 10.0.26100 (build 26200), zh-CN locale
- **WSL**: WSL2, Ubuntu 22.04, default user **root** (so the WSL cwd is `/root`)

## Summary

Switching the workspace from **WSL back to Local (Windows)** via the status-bar workspace-environment selector (`Windows / WSL: Ubuntu22.04` button) **crashes Terax with a silent process exit**: the window closes with no error dialog, no WER event in the Application log, and no crash dump. This is the same switch path as #356, but instead of a blank terminal the app now dies outright.

Reproduces ~100% of the time in the WSL → Local direction (3/3 in one session). The reverse direction (Local → WSL) works fine.

## Steps to reproduce

1. Launch Terax 0.8.6 on Windows with a WSL2 distro ...

### #1155 — Feature request: UI i18n support — Simplified Chinese (zh-CN) interface
- **创建**: 2026-08-20  |  **更新**: 2026-08-20

## Summary

Terax's UI is hardcoded to English — there is currently **no way to switch the interface language**. I'd love to see UI i18n support with at least Simplified Chinese (zh-CN).

## Details

- Running Terax 0.8.6 on Windows 11 with system display language `zh-CN`.
- The app already launches its WebView2 with `--lang=zh-CN`, so `navigator.language` would report `zh-CN` — locale detection would work out of the box — yet all UI strings (settings page, terminal chrome, agent panels, context menus, etc.) are English-only.
- `package.json` currently has no i18n library (no i18next / react-i18next / lingui / etc.) and there are no locale resource files in the bundle.

## Suggestion

1. Add an i18n framework (e.g. `react-i18next`) and extract UI strings into locale resource files.
2. Defa...

### #1149 — Increase terminal pane limit to eight
- **创建**: 2026-08-18  |  **更新**: 2026-08-18

### What problem does this solve?

Terminal tabs are currently limited to four panes. Workflows that monitor several long-running processes or CLI agents need more panes in one shared layout, and currently require extra tabs or an external multiplexer.

### Proposed solution

Raise the fixed per-tab pane limit from four to eight. Keep the renderer pool one slot larger than the pane limit so creating or switching panes does not evict an active leaf.

The implementation would use one shared fixed constant for both the split guard and renderer-pool capacity, avoiding independent limits that can drift.

### Alternatives considered

Multiple Terax tabs lose the single-layout overview. tmux duplicates Terax's native pane management and shortcuts.

### Are you willing to contribute the implementa...

### #1148 — Sandboxed preview iframe blocks cookies: cookie-authenticated local dev servers cannot log in
- **创建**: 2026-08-16  |  **更新**: 2026-08-16

**Terax version:** 0.8.6 (Windows · x86_64)
**Operating system:** Windows
**OS version:** Windows 11, build 10.0.26200. The dev server itself runs under WSL2 and is reached as `http://localhost:5174` from the Windows side, but that is incidental — the same thing happens with a dev server started natively on Windows.

### What happened?

The web preview pane is a sandboxed iframe (per ROADMAP.md: "Sandboxed iframe" / "Sandboxed preview surface"). That sandbox blocks cookie storage for the framed document, so **any local dev server that authenticates with a session cookie cannot be logged into from the preview pane**.

Concretely, with a normal cookie-session app running on `http://localhost:5174`:

1. `POST /api/auth/login` returns **200** with `Set-Cookie: <name>=<token>; HttpOnly; SameSit...

### #1101 — feat(git): git worktree support — #21 was closed as "shipping in 0.7.0" but never landed
- **创建**: 2026-08-01  |  **更新**: 2026-08-01

> **Status of the prior request:** #21 (`feat(git): support git worktrees as switchable workspaces`) was **closed on 2026-05-17 with "shipping in 0.7.0 later today" — but it never landed.** v0.7.0 shipped the source-control panel / git graph, which is the sibling issue #20. No release from v0.7.0 through the current **v0.8.6** (2026-07-27) mentions worktrees, and the docs don't either. #856 raised this on 2026-06-23 and is still unanswered. Both implementation PRs — #617 (agent worktree isolation, draft) and #788 (create-worktree button) — are still open and unmerged, idle 6+ weeks.
>
> Re-filing as a feature request so the ask has a live home and can get an explicit yes/no. **A "no" is genuinely a fine outcome** — it just needs to be written down, because right now the closed-as-shipped i...

### #1088 — Terminal: hover tooltips for user-defined reference patterns (ticket IDs, RFCs, decision-log entries)
- **创建**: 2026-07-31  |  **更新**: 2026-07-31

## Problem

Teams that live in the terminal — especially with AI agents — constantly see short reference IDs in output: ticket numbers (`PROJ-123`), RFCs (`RFC-9042`), decision-log entries (`D-012`). Each one is an opaque string you have to go look up somewhere else, which breaks flow.

OSC 8 hyperlinks don't solve this: most CLI tools and agents don't emit them, and even when they do there is no hover preview — you have to click through blind.

## Proposal

Build on Terax's existing link detection: let the user define **reference patterns** — a regex plus a list of local markdown files. Matching text in the terminal becomes hoverable:

- **Hover** shows a small tooltip with the title of the markdown heading that defines the ID (looked up across the files in order; first file that defines ...

### #1077 — Windows IME candidate window jumps while terminal TUI streams output
- **创建**: 2026-07-29  |  **更新**: 2026-07-29

### Terax version

0.8.6 (built from upstream `main`, commit `2141d16`)

### Operating system

Windows

### OS version

Windows 11 Pro for Workstations, 10.0.28000 (build 28000)

### What happened?

While a terminal TUI is continuously redrawing/streaming output, the Windows Chinese IME candidate window moves left and right during an active composition.

I observed this with Codex running inside the Terax terminal and Microsoft Pinyin. The problem appears before text is committed: start typing Pinyin while the agent is still updating its output/status, and the native candidate popup repeatedly changes position as the TUI redraws.

This is distinct from #1001, which reports committed text being duplicated on Linux, and from #873, where Enter submits during composition on macOS.

Source insp...

### #1028 — Status-bar breadcrumb sends `cd` into a running TUI instead of the shell
- **创建**: 2026-07-19  |  **更新**: 2026-07-21

**Terax version:** 0.8.5

**Operating system:** Windows

**OS version:** Windows 11 (build 26200)

## What happened?

Clicking a segment in the status-bar cwd breadcrumb writes `cd <path>` straight
into the active PTY. When a full-screen TUI holds the foreground (a coding agent
CLI, vim, top, lazygit, yazi), that text lands in *that program's* input instead
of a shell prompt.

Concretely: with a coding-agent CLI running in the terminal, clicking `~` in the
breadcrumb types `cd home` into the agent's chat box. On an agent that is an
actual side effect, not just cosmetic noise: it queues a stray message.

## What did you expect to happen?

The breadcrumb `cd` should only be sent when the shell is actually at a prompt.
When a command or TUI owns the foreground, it should not be injected.

## ...

### #1009 — ⌥+Arrow / ⌥+Backspace word navigation is completely dead on macOS (keyCode 229 guard swallows it)
- **创建**: 2026-07-16  |  **更新**: 2026-07-21

### Summary

The macOS word-navigation shortcuts added in #258 — <kbd>⌥</kbd>+<kbd>←</kbd>/<kbd>→</kbd> (jump word) and <kbd>⌥</kbd>+<kbd>Backspace</kbd> (delete word) — **never fire at all** in the shipped app on macOS. The feature code is correct and present; a guard one layer up drops the events before that code can run, so the shortcuts are silently 100% dead. <kbd>⌃</kbd>+arrow still works, which masks the problem.

### Steps to reproduce

1. macOS, current release (0.8.5).
2. In a terminal pane, type a few words, then press <kbd>⌥</kbd>+<kbd>←</kbd> or <kbd>⌥</kbd>+<kbd>→</kbd>.
3. **Expected:** cursor jumps by word (readline `ESC b` / `ESC f`).
4. **Actual:** nothing happens. Same for <kbd>⌥</kbd>+<kbd>Backspace</kbd>.

### Root cause

The feature itself is implemented correctly in ...

### #981 — Terminal: tmux content bleeds across panes after a resize (xterm grid vs PTY winsize desync)
- **创建**: 2026-07-09  |  **更新**: 2026-07-09

### Terax version

0.8.2 (source build; the bug is present on current `main`, fe4e074)

### Operating system

macOS (Apple Silicon)

### OS version

macOS 27.0 (tmux 3.6a)

### What happened?

Running tmux inside a Terax terminal, pane content intermittently bleeds across the pane dividers: text meant for one tmux pane lands past the divider / in a neighbouring pane, or the status line and borders stop lining up with the visible grid. It is intermittent ("sometimes"), and resizing the window again usually clears it.

I traced it to a mismatch between the size xterm.js renders and the winsize the PTY (and therefore tmux) believes it has. tmux positions every pane by absolute coordinates against the size it was told, so any divergence smears content across the dividers. A normal full-screen ...

### #957 — Settings window floats above ALL applications, not just Terax
- **创建**: 2026-07-06  |  **更新**: 2026-07-06

## Terax version
0.8.2

## Operating system
macOS (Apple Silicon)

## OS version
macOS 26.5.1

## What happened?
The Settings window is configured with system-wide `always_on_top`, so it floats above **every** application on the system — not just Terax's own windows. When Settings is open, it stays on top of Safari, VS Code, Finder, and any other app you switch to.

This is caused by `open_settings_window` in `src-tauri/src/lib.rs`, which sets `.always_on_top(true)` both at window-creation time and when re-focusing an existing settings window:

```rust
// Creation (builder):
.always_on_top(true);

// Reopen path:
let _ = window.set_always_on_top(true);
```

On macOS, Tauri's `always_on_top` maps to `NSWindow.level = .floating`, which raises the window above **all** other processes, not jus...

### #950 — Notification (sound/alert) when a long-running task completes
- **创建**: 2026-07-05  |  **更新**: 2026-07-05

**Problem**

When running a long task in a terminal tab (e.g. a build, test suite, or git operation), I often switch Terax to the background or to another tab. There is no way to know when the task finishes without manually switching back to check. This makes it inconvenient to multitask.

**Requested feature**

A notification mechanism when a long-running shell command finishes and the terminal becomes idle again:

1. **Sound / bell** — Play a system notification sound when a task completes after a configurable silence threshold (e.g. if the terminal has been idle for N seconds after output)
2. **OS notification** — Show a Windows toast / system tray notification when the task finishes, optionally with the last line of output
3. **Minimum runtime filter** — Only trigger if the command ran...

### #949 — Tab title should show shell name instead of raw username
- **创建**: 2026-07-05  |  **更新**: 2026-07-05

**Describe the issue**

Currently, Terax displays the raw window title sent by the shell as the tab title. When using Git Bash (MSYS2), the shell sends something like `zhaid@HOSTNAME ~`, so the tab shows just "zhaid". If you have multiple tabs running different shells (PowerShell, Git Bash, WSL), you can not tell which is which at a glance.

**Suggested improvements**

1. **Show shell name** — Derive the tab title from the basename of `terminalShell` in settings.json, e.g. `pwsh.exe` → "PowerShell 7", `bash.exe` → "Git Bash"
2. **Allow custom tab prefix** — Let users configure a custom tab name/prefix in settings
3. **Better fallback** — When the shell does not send an OSC title sequence, fall back to the shell name rather than the username

**Environment**

- Terax version: 0.8.2
- Window...

### #906 — feat(ai): add built-in opencode-go provider preset with default endpoint and model
- **创建**: 2026-06-30  |  **更新**: 2026-06-30

### What problem does this solve?

Terax already supports `openai-compatible` as a generic custom endpoint (#169, #405), but **opencode-go** is a distinct paid AI subscription service with its own API endpoint, authentication model (env var `OPENCODE_API_KEY`), and model lineup. Users currently have to:

1. Manually add a custom OpenAI-compatible endpoint with the URL `https://opencode.ai/zen/go/v1/chat/completions`
2. Manually type in the model ID
3. Deal with model selection issues (#502 — model defaults to "Claude Opus 4" and can't be properly selected)

This creates friction for users who already have an opencode-go subscription. Every other major paid AI provider (OpenAI, Anthropic, Google, xAI, DeepSeek, Groq, Mistral, OpenRouter) has a first-class provider entry with proper defaults...

### #898 — Terminal: WebGL renderer falls back to JetBrains Mono for some glyphs when a system-installed Nerd Font is set (macOS/WKWebView)
- **创建**: 2026-06-28  |  **更新**: 2026-07-01

### Terax version

0.8.2 / `main`

### Operating system

macOS (Apple Silicon)

### OS version

macOS 26.5.1

### What happened?

With the terminal **Font family** set to a system-installed Nerd Font (`ComicShannsMono Nerd Font Mono`, installed in `~/Library/Fonts`), the terminal renders in **two fonts at once**: most text uses the configured font, but a subset of glyphs (uppercase letters, in my case) render in the bundled fallback **JetBrains Mono** — a visible mismatch.

Narrowing it down:

- **It's the WebGL renderer.** Disabling WebGL (Settings → General) removes the mismatch entirely; re-enabling brings it back. Same conclusion as #30.
- **Not glyph coverage.** I parsed the `cmap` of all six Comic Shanns faces — every probed codepoint (ASCII incl. uppercase, box-drawing, braille, and...

### #877 — Terminal freezes when exiting opencode session (Ctrl+C or /exit)
- **创建**: 2026-06-25  |  **更新**: 2026-06-25

## Bug Description

When running opencode in the Terax AI terminal, the session works correctly. However, when exiting the session using **Ctrl+C** or the **/exit** command, the terminal freezes completely and becomes unresponsive. The terminal shows just the PowerShell prompt with a blinking cursor but does not accept any further input.

## Steps to Reproduce

1. Open Terax AI terminal
2. Run opencode
3. Use the opencode session normally
4. Exit using either:
   - Press Ctrl+C
   - Type /exit command
5. Terminal freezes and becomes unresponsive

## Expected Behavior

The terminal should return to a normal usable state after exiting the opencode session.

## Actual Behavior

The terminal freezes — no input is accepted, and the only way to regain control is to close and reopen the terminal....

### #856 — Git worktree support (#21) appears unshipped — closed pointing to source-control panel (#20)?
- **创建**: 2026-06-23  |  **更新**: 2026-08-01

Follow-up to #21 (closed).

#21 (git worktrees as switchable workspaces) was closed on 2026-05-17 with
"shipping in 0.7.0 later today". But checking the actual releases:

- **v0.7.0** shipped the **source control panel / git graph** (PR #174) — that's
  the sibling issue **#20**, not worktree support.
- No release from **v0.7.0 through the current v0.8.1** mentions a "Workspaces"
  worktree-switching section or a `create_worktree` AI tool.
- The worktree PRs are still **open / unmerged**: #617 (agent worktree isolation),
  #788 (create-worktree button).

So it looks like #21 was closed by conflating it with #20's source-control panel,
and the requested feature (sidebar Workspaces section + worktree switch/create/remove
+ `create_worktree` AI tool) never actually landed.

Could #21 be reope...

### #839 — feat(settings): custom UI font family, separate from the terminal font
- **创建**: 2026-06-20  |  **更新**: 2026-06-20

## What problem does this solve?

The terminal already supports a custom font family (`terminalFontFamily`, shipped in #373), but the rest of the interface — menus, panels, chat, settings, code blocks in AI messages, file paths, commit hashes — is locked to the bundled Inter / default monospace. I use my own custom-designed font (`Mxerff medium Extended`) installed system-wide, and I want the app chrome to use it, the same way VS Code lets me set the editor/UI font independently from the terminal. Today there is no way to do this without editing built-in CSS.

This fits the roadmap's "Themes and customizations (terminal themes, UI accents, keybindings, layout)" line and the "UI accent palettes that fit the lightweight aesthetic" contribution area.

## Proposed solution

Two new optional se...

### #820 — Terminal: blank font setting renders Nerd Font icons as tofu on macOS (auto-detect fails in WKWebView)
- **创建**: 2026-06-17  |  **更新**: 2026-06-17

### Terax version

0.8.0 (also present on `main`)

### Operating system

macOS (Apple Silicon)

### OS version

macOS 26.5 (25F71)

### What happened?

With the terminal **Font family** preference left blank (the default), powerline / Nerd Font glyphs from oh-my-zsh / Powerlevel10k / Starship render as tofu boxes — **even though a Nerd Font (e.g. "MesloLGS NF" / "MesloLGS Nerd Font Mono") is installed system-wide**.

The auto-detect path is the cause. `src/lib/fonts.ts` `detectMonoFontFamily()` selects a Nerd Font only via `document.fonts.check(\`12px "${f}"\`)` (line 56). Inside the macOS WKWebView, `document.fonts.check()` returns **false** for OS-installed fonts that aren't `@font-face`-registered (Terax bundles no Nerd Font — intentional, for bundle size). So the loop over `NERD_FONT_C...

### #793 — SSH 连接后目录树仍显示本地文件，不显示远程服务器目录
- **创建**: 2026-06-13  |  **更新**: 2026-07-12

## 问题描述

通过 SSH 连接到远程服务器后，左侧目录树（file explorer）仍然显示**本机**的文件系统，而不是远程服务器的目录结构。

## 复现步骤

1. 在 Terax 中通过 SSH 连接到远程服务器
2. 观察左侧目录树面板
3. 目录树显示的是本地 `~` 目录，而非远程服务器的当前工作目录

## 期望行为

SSH 连接后，目录树应自动切换为显示**远程服务器**的文件系统，可以浏览、打开、编辑远程文件。

## 实际行为

目录树始终显示本地文件，无法通过目录树浏览远程目录。

## 环境

- **Terax 版本**: latest
- **OS**: macOS 15.5

## 背景

相关 feature 在以下 PR/issue 中已经实现：
- #101 — feat(explorer): add remote file explorer over SSH/SFTP (已 merge)
- #235 — Feature Request: Show remote directory tree when connected via SSH (已关闭)

但实际使用中该功能似乎未生效，可能是退化（regression）或不完整实现。

### #773 — [Bug] External links: security modal then no browser open; AI Markdown also locks composer until restart
- **创建**: 2026-06-10  |  **更新**: 2026-07-29

**Summary**

Clicking external links inside Terax often shows a `tauri.localhost` security warning, then fails to open the default browser after Confirm/OK. In at least one path the failure also bricks keyboard input in the built-in agent composer until a full app restart.

This is not limited to WSL or terminal OSC 8 links. It reproduces on native Windows from the built-in AI conversation Markdown as well.

**Environments**

| Path | Host | Link source |
|------|------|-------------|
| A (original report) | Windows 11 host + WSL2 guest TUI | OSC 8 / terminal hyperlinks from an inner full-screen TUI |
| B (corroborated) | Native Windows 11, no WSL | Built-in Terax AI conversation Markdown (`Streamdown`) |

Path B repro details from @Q561608501:
- Terax 0.8.6, upstream `main` at `2141d16`
-...

### #772 — [Bug] Scrolling in inner TUIs causes persistent character sticking / matrix effect, progressively unreadable
- **创建**: 2026-06-10  |  **更新**: 2026-06-10

**Description**

Scrolling the main output area inside Terax terminal (while running a full-screen inner TUI with live updates and streaming content) causes characters to "stick" to the screen. This creates a persistent Matrix digital rain-like effect where old text overlays and does not clear properly, progressively making the screen unreadable.

**Reproduction (example)**

1. Open Terax terminal.
2. Launch a sophisticated inner TUI that performs frequent partial screen updates and streaming output (example: `hermes --tui`).
3. Generate output with conversations, tool results, or streaming responses.
4. Scroll up/down (mouse wheel or keyboard) in the primary output area.
5. Watch characters remain and accumulate over repeated scrolls.

**Expected**

Clean, artifact-free scrolling with pro...

### #750 — CJK (Chinese/Japanese/Korean) characters cause text ghosting/scattering artifacts with WebGL renderer
- **创建**: 2026-06-07  |  **更新**: 2026-06-07

## Description

When running TUI applications that output CJK characters (Chinese, Japanese, Korean) in Terax's terminal, the right side of the screen accumulates ghost text artifacts—fragments of previous output lines that are not properly cleared when new, shorter content overwrites them. This makes Hermes TUI, Claude Code, and other CJK-heavy TUI apps visually unusable.

## Steps to Reproduce

1. Open Terax terminal
2. Run a CJK-heavy TUI application (e.g. `hermes --tui` or `opencode`)
3. Send a message containing Chinese/Japanese/Korean text
4. Observe the right side of the screen—ghost text accumulates

Alternatively, run this minimal reproduction:

```bash
# Step 1: Display long lines with mixed CJK + ASCII
echo "thinking: disabled ✅ | model: deepseek-v4-flash | effort: high"
echo "功...

### #720 — Feature Request: i18n / Internationalization Support
- **创建**: 2026-06-04  |  **更新**: 2026-07-18

## Problem

Terax currently has all UI strings hardcoded in English across JSX components. There is no i18n framework (no `react-i18next`, `react-intl`, etc.), no locale setting in preferences, and no translation infrastructure. This makes it impossible for non-English-speaking developers to use Terax in their native language.

## Proposal

Add internationalization (i18n) support so the UI can be translated into other languages (Chinese, Japanese, Korean, Spanish, French, etc.).

Suggested approach:

1. **Integrate `react-i18next`** — mature, well-supported i18n framework for React
2. **Extract all hardcoded strings** into JSON translation files (e.g. `public/locales/en/translation.json`)
3. **Add a language selector** to Settings → General (e.g. a dropdown under "Appearance")
4. **Persist...

### #662 — Render LaTeX math in chat (KaTeX stylesheet not loaded)
- **创建**: 2026-06-01  |  **更新**: 2026-06-08

### What problem does this solve?

When the assistant replies with math — inline `$…$` or block `$$…$$` — the chat shows it unstyled/misaligned instead of as rendered formulas. For anything math-heavy (derivations, model formulas), the AI chat is effectively unreadable.

### Proposed solution

The chat already renders with Streamdown (`^2.5.0`), whose default pipeline parses math (`remark-math`) and emits KaTeX markup. The problem looks like a missing stylesheet: KaTeX's CSS is never imported, so the emitted math renders without KaTeX fonts/layout. `src/styles/globals.css` only has `@source ".../streamdown/dist/index.js"` (a Tailwind content scan), not the KaTeX stylesheet.

Importing it once where the chat mounts (or globally) — `import "katex/dist/katex.min.css";` — should make existing ...

### #660 — [Bug]: Claude Code TUI — lost scrollback + garbled/overlapping text after WebKit hibernation (persists on 0.7.3, macOS 26.5)
- **创建**: 2026-06-01  |  **更新**: 2026-06-01

### Terax version

0.7.3

### Operating system

macOS (Apple Silicon)

### OS version

macOS 26.5 (build 25F71)

### What happened?

Running `claude` (Claude Code) in the Terax terminal, the display corrupts badly — both rendering and scrollback:

- **Overlapping / garbled text** — previous lines don't clear and new frames are painted on top of old ones, so two lines end up drawn over each other, with stray characters injected. Examples from my session: `output` → `out7ut`, `during hibernation` → `during5hibernation`, `Julienning…` → `teulienning…`, `Searching` artifacts left behind under the live spinner. (See screenshots 1–3.)
- **Lost scrollback** — once it corrupts, I can't scroll up to see previous output at all.
- **Resize is the only "fix"** — resizing the window forces a repaint an...

### #608 — [Bug]: Live PTY sessions are killed when switching between Local and WSL environments
- **创建**: 2026-05-30  |  **更新**: 2026-05-30

**Describe the bug:**
When switching the workspace/terminal environment between the Local (Windows) side and the WSL side, any active live terminal sessions are immediately killed.

**Technical context:**
It appears that toggling the environment type triggers the Rust backend to aggressively tear down all active `portable-pty` instances associated with the previous environment. Instead of wiping the state, existing tabs should either persist in their original environment (allowing a mix of Windows and WSL tabs simultaneously), or the UI should cleanly decouple the environment toggle from active PTY session lifecycles.
