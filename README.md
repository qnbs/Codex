# Codex: Ihr KI-gestützter Wissenspartner

[![Open in AI Studio](https://img.shields.io/badge/Live%20Demo-Open%20in%20AI%20Studio-blue?style=for-the-badge&logo=google&logoColor=white)](https://ai.studio/apps/drive/1e5Yc-ommOORZdnzXxOBpCWtjJw5dIypi)

**Codex** ist nicht nur ein Informationswerkzeug; es ist ein aktiver, KI-gestützter Wissenspartner, der Sie nicht nur informiert, sondern auch inspiriert, Verbindungen aufzeigt und das Lernen zu einem immersiven Erlebnis macht. Es wurde auf drei Grundpfeilern entwickelt: **Personalisierung**, **Visualisierung** und **Vernetzung**.

---

## 🚀 Live-Demo auf Google AI Studio

Erleben Sie Codex jetzt live und ohne Installation direkt in Ihrem Browser. Diese Version wird auf Google AI Studio gehostet, einer Plattform, die es Entwicklern ermöglicht, KI-gestützte Anwendungen zu erstellen und zu teilen.

**[Öffnen Sie die Codex-App in AI Studio](https://ai.studio/apps/drive/1e5Yc-ommOORZdnzXxOBpCWtjJw5dIypi)**

### Was ist Google AI Studio?

[Google AI Studio](https://ai.google.dev/aistudio) ist eine webbasierte Entwicklungsumgebung zum Prototyping und Erstellen von Anwendungen mit dem Google Gemini API. Es bietet eine einfache Möglichkeit, generative Modelle zu testen und deren Code in Ihre Projekte zu integrieren. Die "Apps"-Funktion in AI Studio ermöglicht es Entwicklern wie uns, voll funktionsfähige Webanwendungen wie Codex zu hosten und für ein breites Publikum zugänglich zu machen. Indem wir Codex hier bereitstellen, stellen wir sicher, dass Sie immer die neueste Version mit einer nahtlosen und leistungsstarken Infrastruktur nutzen können.

---

## ✨ Kernfunktionen

Codex ist vollgepackt mit Funktionen, die das Entdecken von Wissen neu definieren:

- **✍️ Dynamische Artikelerstellung:** Geben Sie ein beliebiges Thema ein und erhalten Sie einen umfassenden, enzyklopädischen Artikel, der von der `gemini-2.5-flash`-KI in Echtzeit generiert wird. Die Länge ist anpassbar (Kompakt, Standard, Ausführlich).

- **🎨 KI-gestützte Visualisierungen:** Jeder Artikelabschnitt kann mit einem einzigartigen, KI-generierten Bild (`imagen-4.0-generate-001`) versehen werden. Passen Sie den visuellen Stil an (Fotorealistisch, Künstlerisch, Vintage etc.).

- **✏️ KI-gestützte Bildbearbeitung:** Bearbeiten Sie jedes generierte Bild direkt im Artikel. Fahren Sie mit der Maus über ein Bild, klicken Sie auf das Bearbeitungssymbol und geben Sie einen Text-Prompt ein (z. B. "Ändere die Jahreszeit auf Winter"), um das Bild mit `gemini-2.5-flash-image-preview` zu modifizieren.

- **🔍 Interaktive Textwerkzeuge:** Markieren Sie einen beliebigen Text im Artikel, um sofort ein Pop-up mit drei Optionen zu erhalten:
    - **Definieren:** Erhalten Sie eine kurze, wörterbuchartige Definition.
    - **Erklären:** Lassen Sie sich das Konzept einfach und verständlich erläutern.
    - **Visualisieren:** Erzeugen Sie ein KI-Bild, das den markierten Begriff darstellt.

- **💡 Athena KI-Copilot:** Ein kontextbewusster Chat-Assistent, der den gesamten Artikel gelesen hat. Stellen Sie Folgefragen, bitten Sie um Klärung oder vertiefen Sie Ihr Verständnis im Dialog. Athena schlägt auch intelligente Folgefragen vor.

- **🕸️ Synapsen-Graph:** Eine interaktive Visualisierung am Ende jedes Artikels, die Ihr aktuelles Thema mit verwandten Konzepten verbindet. Jeder Knoten ist ein Sprungbrett zu einem neuen Artikel, das zum organischen Erkunden einlädt.

- **🚀 Kosmischer Sprung (Serendipity):** Fühlen Sie sich abenteuerlustig? Die "Kosmischer Sprung"-Funktion schlägt ein überraschendes, aber lose verwandtes Thema vor, um Sie auf unerwartete und faszinierende Wissenspfade zu führen.

- **📊 Schnellzusammenfassungen:** Erhalten Sie die Essenz eines Artikels mit einem Klick. Wählen Sie zwischen:
    - **Zfsg. (TL;DR):** Eine ultrakurze Zusammenfassung.
    - **EWI5 (ELI5):** Eine Erklärung in einfachsten Worten.
    - **Kernaussagen:** Die wichtigsten Punkte als Liste.
    - **Analogie:** Eine einfache Metapher zum Verständnis des Hauptkonzepts.

- **📚 Umfassende Datenverwaltung:** Ihr Wissen gehört Ihnen. Organisieren Sie Ihre Entdeckungen mit:
    - **Verlauf:** Greifen Sie auf Ihre zuletzt besuchten Themen zu.
    - **Lesezeichen:** Speichern Sie wichtige Artikel.
    - **Lernpfade:** Kuratieren Sie Sammlungen von Artikeln, um ein Thema aus mehreren Perspektiven zu lernen.
    - **Sitzungs-Schnappschüsse:** Speichern Sie einen kompletten Zustand (Artikel, Chat, Graph), um ihn später exakt wiederherzustellen.

- **⚙️ Vollständige Personalisierung:** Passen Sie Codex an Ihre Vorlieben an. Ändern Sie Akzentfarbe, Schriftart, Textgröße und KI-Verhalten in den Einstellungen.

- **📥 Datenportabilität:** Exportieren und importieren Sie alle Ihre Benutzerdaten (Einstellungen, Verlauf, Lesezeichen etc.) als einzelne JSON-Datei.

---

## 🛠️ Technologie-Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **KI-Modelle:** Google Gemini API
  - **Textgenerierung:** `gemini-2.5-flash`
  - **Bilderzeugung:** `imagen-4.0-generate-001`
  - **Bildbearbeitung:** `gemini-2.5-flash-image-preview`
- **Speicher:** Browser LocalStorage für die persistente Speicherung aller Benutzerdaten.

---

## 🚀 Erste Schritte (Entwickler)

Um Codex lokal auszuführen und weiterzuentwickeln, benötigen Sie einen Google Gemini API-Schlüssel.

1.  **Klonen Sie das Repository:**
    ```bash
    git clone <repository-url>
    cd codex-app
    ```

2.  **Installieren Sie die Abhängigkeiten:**
    ```bash
    npm install
    ```

3.  **Konfigurieren Sie Ihren API-Schlüssel:**
    Die Anwendung erwartet den API-Schlüssel in einer Umgebungsvariable. Erstellen Sie eine `.env`-Datei im Stammverzeichnis des Projekts und fügen Sie Ihren Schlüssel hinzu:
    ```
    # .env
    API_KEY="DEIN_GOOGLE_GEMINI_API_KEY"
    ```
    *Hinweis: Da dies eine rein clientseitige Anwendung ist, wird der API-Schlüssel im Browser verfügbar sein. Setzen Sie für Produktionsanwendungen entsprechende Sicherheitsmaßnahmen (z. B. einen Backend-Proxy) um.*

4.  **Starten Sie den Entwicklungsserver:**
    ```bash
    npm run dev
    ```

    Öffnen Sie `http://localhost:5173` (oder den in Ihrem Terminal angezeigten Port) in Ihrem Browser.