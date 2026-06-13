# MindMate Wellbeing Chatbot

MindMate is a Rasa-based mental-wellness chatbot with a simple web interface. It supports basic conversations around anxiety, journaling, guided breathing, mood tracking, emergency guidance, and self-care tips.

> **Important:** MindMate is not a medical, psychological, or emergency-service tool. It provides general wellbeing support only. Users in immediate danger should contact local emergency services or a trusted person nearby.

## Features

- Anxiety-support responses
- Guided breathing exercise
- Journaling prompts
- Mood tracking prompts
- Self-care suggestions
- Emergency-support message for crisis-related inputs
- Lightweight HTML/CSS/JavaScript chat interface
- Custom Rasa action server support

## Tech Stack

- Python
- Rasa Open Source
- Rasa SDK
- HTML, CSS, JavaScript

## Project Structure

```text
mindmate-wellbeing-chatbot/
├── actions/
│   ├── __init__.py
│   └── actions.py
├── assets/
│   ├── bg.jpg
│   └── img2.png
├── data/
│   ├── nlu.yml
│   ├── rules.yml
│   └── stories.yml
├── tests/
│   └── test_stories.yml
├── config.yml
├── credentials.yml
├── domain.yml
├── endpoints.yml
├── index.html
├── script.js
├── styles.css
├── requirements.txt
├── .gitignore
└── README.md
```

## Setup Instructions

### 1. Create and activate a virtual environment

```bash
python -m venv .venv
```

On Windows:

```bash
.venv\Scripts\activate
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Train the Rasa model

```bash
rasa train
```

### 4. Run the custom action server

Open a terminal and run:

```bash
rasa run actions
```

### 5. Run the Rasa server

Open another terminal and run:

```bash
rasa run --enable-api --cors "*"
```

### 6. Open the web interface

Open `index.html` in your browser and start chatting with the bot.

## Example Messages

Try these sample inputs:

```text
hello
I feel anxious
help me with deep breathing
I want to journal
track my mood
I don't feel safe
give me self-care tips
bye
```

## Notes for GitHub Upload

The `models/` folder is intentionally ignored because trained Rasa model files can become large. After cloning the repository, train a fresh model using:

```bash
rasa train
```

## Future Improvements

- Add richer NLU training examples
- Store mood history in a database
- Add secure user authentication
- Improve frontend error handling and accessibility
- Add multilingual support
- Add more structured journaling and grounding exercises
