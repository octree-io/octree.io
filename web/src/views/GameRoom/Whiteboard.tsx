import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import './Whiteboard.css'

export default function Whiteboard() {
  return (
    <div className="wb-wrap">
      <Excalidraw
        theme="light"
        UIOptions={{
          canvasActions: {
            export: false,
            saveAsImage: false,
            saveToActiveFile: false,
          },
        }}
      />
    </div>
  )
}
