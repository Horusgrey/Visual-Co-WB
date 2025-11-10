
import React, { useState } from 'react';
import JSZip from 'jszip';
import type { StyleSeed, Scene, Character, ScriptLine } from '../types';
import Modal from './common/Modal';
import Icon from './common/Icon';
import Spinner from './common/Spinner';
import Tooltip from './common/Tooltip';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: {
    styleSeed: StyleSeed | null;
    scenes: Scene[];
    characters: Character[];
    script: ScriptLine[];
    styleSeedHistory: StyleSeed[];
  };
}

// Storing all file contents as strings to be zipped
const sourceFiles: Record<string, () => Promise<string>> = {
    'index.html': async () => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Visual Co-Pilot</title>
    
    <!-- PWA Manifest and Theme -->
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#583D72">

    <!-- iOS specific PWA tags -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Visual Co-Pilot">

    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              'brand-purple': '#583D72',
              'brand-pink': '#9F4A80',
              'brand-teal': '#00A896',
              'brand-light': '#F0F3F5',
              'brand-dark': '#1A1A2E',
              'brand-dark-accent': '#2A2A4E',
            },
            animation: {
              'fade-in': 'fadeIn 0.5s ease-in-out',
              'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
              fadeIn: {
                '0%': { opacity: '0' },
                '100%': { opacity: '1' },
              },
            }
          }
        }
      }
    </script>
  <script type="importmap">
{
  "imports": {
    "react/": "https://aistudiocdn.com/react@^19.2.0/",
    "react": "https://aistudiocdn.com/react@^19.2.0",
    "react-dom/": "https://aistudiocdn.com/react-dom@^19.2.0/",
    "@google/genai": "https://aistudiocdn.com/@google/genai@^1.25.0",
    "jszip": "https://aistudiocdn.com/jszip@3.10.1/dist/jszip.min.js"
  }
}
</script>
</head>
  <body class="bg-brand-dark text-brand-light">
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          }, err => {
            console.log('ServiceWorker registration failed: ', err);
          });
        });
      }
    </script>
  </body>
</html>`,
    'index.tsx': async () => (await fetch('/index.tsx')).text(),
    'metadata.json': async () => (await fetch('/metadata.json')).text(),
    'manifest.json': async () => (await fetch('/manifest.json')).text(),
    'sw.js': async () => (await fetch('/sw.js')).text(),
    'App.tsx': async () => (await fetch('/App.tsx')).text(),
    'types.ts': async () => (await fetch('/types.ts')).text(),
    'services/geminiService.ts': async () => (await fetch('/services/geminiService.ts')).text(),
    'services/audioUtils.ts': async () => (await fetch('/services/audioUtils.ts')).text(),
    'components/HomePage.tsx': async () => (await fetch('/components/HomePage.tsx')).text(),
    'components/ScenesPage.tsx': async () => (await fetch('/components/ScenesPage.tsx')).text(),
    'components/CharactersPage.tsx': async () => (await fetch('/components/CharactersPage.tsx')).text(),
    'components/ScriptBuilderPage.tsx': async () => (await fetch('/components/ScriptBuilderPage.tsx')).text(),
    'components/PostProductionPage.tsx': async () => (await fetch('/components/PostProductionPage.tsx')).text(),
    'components/PlaygroundPage.tsx': async () => (await fetch('/components/PlaygroundPage.tsx')).text(),
    'components/ImageEditorModal.tsx': async () => (await fetch('/components/ImageEditorModal.tsx')).text(),
    'components/ExportModal.tsx': async () => (await fetch('/components/ExportModal.tsx')).text(),
    'components/ChatWidget.tsx': async () => (await fetch('/components/ChatWidget.tsx')).text(),
    'components/VoiceAssistantWidget.tsx': async () => (await fetch('/components/VoiceAssistantWidget.tsx')).text(),
    'components/common/Spinner.tsx': async () => (await fetch('/components/common/Spinner.tsx')).text(),
    'components/common/Icon.tsx': async () => (await fetch('/components/common/Icon.tsx')).text(),
    'components/common/Modal.tsx': async () => (await fetch('/components/common/Modal.tsx')).text(),
    'components/common/Tooltip.tsx': async () => (await fetch('/components/common/Tooltip.tsx')).text(),
    'README.md': async () => `# Visual Co-Pilot Source Code

This folder contains the source code for the Visual Co-Pilot application.

## How to Run

This project is a self-contained web application that can be run locally without a build step, thanks to ES modules and import maps.

1.  **Obtain an API Key:** You need a Google Gemini API key to use the app's features. You can get one from Google AI Studio.

2.  **Set up a local server:** You cannot open \`index.html\` directly from your file system due to browser security restrictions (CORS). You need to serve the files from a local web server.

    If you have Python installed, the easiest way is:
    - Open a terminal or command prompt in this folder.
    - Run \`python -m http.server\` (for Python 3) or \`python -m SimpleHTTPServer\` (for Python 2).
    - This will start a server, usually at \`http://localhost:8000\`.

    Alternatively, you can use other tools like the "Live Server" extension for VS Code.

3.  **Set the API Key:** The application expects the API key to be available as an environment variable. Since we are running in a browser without a backend, we can simulate this.
    - Open your browser's developer tools (usually F12 or Ctrl+Shift+I).
    - Go to the **Console** tab.
    - Before using the app, paste and run the following command, replacing \`"YOUR_API_KEY_HERE"\` with your actual key:
      \`\`\`javascript
      process = { env: { API_KEY: "YOUR_API_KEY_HERE" } };
      \`\`\`
    - **Note:** You will need to do this every time you reload the page.

4.  **Open the App:** Open your web browser and navigate to the address of your local server (e.g., \`http://localhost:8000\`).

Now you can use the Visual Co-Pilot application locally!
  `,
};

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, projectData }) => {
  const [isZipping, setIsZipping] = useState(false);

  const handleExportProject = () => {
    try {
      const dataStr = JSON.stringify(projectData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'visual-copilot-project.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export project data:", error);
      alert("An error occurred while exporting the project data.");
    }
  };

  const handleExportSource = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      
      for (const [path, getContent] of Object.entries(sourceFiles)) {
        try {
            const content = await getContent();
            zip.file(path, content);
        } catch(e) {
            console.warn(`Could not fetch ${path} for zipping, skipping.`);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'visual-copilot-source.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export source code:", error);
      alert("An error occurred while exporting the source code.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Project">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          You can export your project data as a JSON file to save your progress or transfer it, or download the entire application's source code.
        </p>
        <Tooltip text="Save all your scenes, characters, and script to a single file." className="w-full">
            <button
                onClick={handleExportProject}
                className="w-full flex items-center justify-center gap-3 bg-brand-teal hover:bg-brand-teal/80 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300"
            >
                <Icon name="book" className="w-5 h-5" />
                Export Project Data (.json)
            </button>
        </Tooltip>
        <Tooltip text="Download a .zip file containing all the HTML, CSS, and JavaScript for this app." className="w-full">
            <button
                onClick={handleExportSource}
                disabled={isZipping}
                className="w-full flex items-center justify-center gap-3 bg-brand-purple hover:bg-brand-purple/80 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:bg-gray-600"
            >
                {isZipping ? <Spinner /> : <Icon name="download" className="w-5 h-5" />}
                {isZipping ? 'Zipping...' : 'Export Source Code (.zip)'}
            </button>
        </Tooltip>
      </div>
    </Modal>
  );
};

export default ExportModal;
