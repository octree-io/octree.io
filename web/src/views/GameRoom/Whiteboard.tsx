import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import './Whiteboard.css'

export default function Whiteboard() {
  return (
    <div className="wb-wrap">
      <Excalidraw
        theme="dark"
        UIOptions={{
          canvasActions: {
            export: false,
            saveAsImage: false,
            saveToActiveFile: false,
          },
        }}
        initialData={{
          appState: {
            viewBackgroundColor: '#0f0f14',
            currentItemStrokeColor: '#a78bfa',
            currentItemBackgroundColor: '#1e1e2e',
            currentItemFontFamily: 2,
          },
        }}
      />
    </div>
  )
}
