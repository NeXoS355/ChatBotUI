import ollama
import time

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer


class MyEventHandler(FileSystemEventHandler):
    def on_any_event(self, event: FileSystemEvent) -> None:
        print(event.event_type)
        if(event.event_type == "created" and str(event.src_path).endswith(".png")):
            response = ollama.chat(
                model='llama3.2-vision',
                messages=[{
                    'role': 'user',
                    'content': 'Das Dokument ist eine Rechnung die wir bezahlen müssen. Wie lautet die Rechnungsnummer, das Rechnungsdatum, der Lieferant in Kurzform,zu zahlende Preis? Die Antwort wird in eine Datenbank gespeichert, deshalb gib bitte nur die Antwort nur mit dem Zeichen | getrennt zurück ohne Beschreibung oder Formatierung',
                    'images': [event.src_path]
                }]
            )
            print(response.message.content)



event_handler = MyEventHandler()
observer = Observer()
observer.schedule(event_handler, ".", recursive=True) 
observer.start()
try:
    while True:
        time.sleep(1)
finally:
    observer.stop()
    observer.join()
