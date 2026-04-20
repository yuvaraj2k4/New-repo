import codecs

path = r'd:\AI_SDLC\frontendReplit\src\app\globals.css'
with codecs.open(path, 'r', 'utf-8') as f:
    text = f.read()

text = text.replace("'Arial', sans-serif;", "var(--font-inter), sans-serif;")
text = text.replace('"Arial", sans-serif;', "var(--font-inter), sans-serif;")
text = text.replace("font-family: 'Arial';", "font-family: var(--font-inter), sans-serif;")
text = text.replace("font-family: Arial;", "font-family: var(--font-inter), sans-serif;")

with codecs.open(path, 'w', 'utf-8') as f:
    f.write(text)
print("Font replacement complete!")
