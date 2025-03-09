import ollama
import time

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer


class MyEventHandler(FileSystemEventHandler):
    def on_any_event(self, event: FileSystemEvent) -> None:
        print(event.event_type)
        if(event.event_type == "created" and str(event.src_path).endswith(".png")):
            response = ollama.chat(
                model='llama3.2-custom',
                messages=[{
                    'role': 'user',
                    'content': 'Wie lautet die Rechnungsnummer?',
                    'images': [event.src_path]
                }]
            )
            print('Rech-Nr.: ' +  response.message.content)
            response = ollama.chat(
                model='llama3.2-custom',
                messages=[{
                    'role': 'user',
                    'content': 'Wann wurde die Rechnung ausgestellt?',
                    'images': [event.src_path]
                }]
            )
            print('Rechnunsdatum.: ' +  response.message.content)
            response = ollama.chat(
                model='llama3.2-custom',
                messages=[{
                    'role': 'user',
                    'content': 'Von welcher Firma kommt die Rechnung?',
                    'images': [event.src_path]
                }]
            )
            print('Lieferant: ' +  response.message.content)
            response = ollama.chat(
                model='llama3.2-custom',
                messages=[{
                    'role': 'user',
                    'content': 'Wie hoch ist der zu zahlende Gesamtpreis der Rechnung?',
                    'images': [event.src_path]
                }]
            )
            print('Preis: ' +  response.message.content)



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
