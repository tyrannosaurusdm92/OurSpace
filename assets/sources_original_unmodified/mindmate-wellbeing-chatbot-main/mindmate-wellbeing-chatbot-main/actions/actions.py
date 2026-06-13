"""Custom Rasa actions for the MindMate wellbeing chatbot.

The bot provides simple mental-wellness support only. It is not a replacement
for professional medical, psychological, or emergency support.
"""

from typing import Any, Dict, List, Text

from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher


class ActionAnxietyResponse(Action):
    def name(self) -> Text:
        return "action_anxiety_response"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(
            text=(
                "I'm sorry you're feeling anxious. Try taking one slow breath in, "
                "holding it briefly, and breathing out gently. You can also journal "
                "what is worrying you or ask me for a breathing exercise."
            )
        )
        return []


class ActionJournal(Action):
    def name(self) -> Text:
        return "action_journal"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        journal_entry = tracker.get_slot("journal_entry")
        if journal_entry:
            dispatcher.utter_message(
                text=(
                    "Thank you for sharing that. Journaling can help you notice "
                    "patterns in your feelings and thoughts."
                )
            )
        else:
            dispatcher.utter_message(
                text=(
                    "Sure. You can start with: 'Right now I feel...', "
                    "'The main thing on my mind is...', or 'One small thing I need is...'."
                )
            )
        return []


class ActionEmergencyHelp(Action):
    def name(self) -> Text:
        return "action_emergency_help"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(
            text=(
                "I'm really sorry you're going through this. If you are in immediate "
                "danger or might hurt yourself, please contact local emergency services "
                "now or reach out to a trusted person nearby. If possible, move away "
                "from anything you could use to harm yourself and stay with someone safe."
            )
        )
        return []


class ActionSelfCareTips(Action):
    def name(self) -> Text:
        return "action_self_care_tips"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(
            text=(
                "Here are a few gentle self-care ideas:\n"
                "1. Drink water and eat something nourishing.\n"
                "2. Step away from screens for a few minutes.\n"
                "3. Take a short walk or stretch.\n"
                "4. Write down one worry and one next step.\n"
                "5. Message someone you trust if you feel alone."
            )
        )
        return []


class ActionTrackMood(Action):
    def name(self) -> Text:
        return "action_track_mood"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        emotion = tracker.get_slot("emotion")
        mood_level = tracker.get_slot("mood_level")

        if emotion or mood_level:
            details = []
            if emotion:
                details.append(f"emotion: {emotion}")
            if mood_level:
                details.append(f"mood level: {mood_level}")
            dispatcher.utter_message(
                text=f"Mood noted ({', '.join(details)}). Tracking moods can help you notice patterns over time."
            )
        else:
            dispatcher.utter_message(
                text="Tell me your mood in a simple way, such as 'I feel sad' or 'My mood is 6 out of 10'."
            )
        return []


class ActionGuidedBreathing(Action):
    def name(self) -> Text:
        return "action_guided_breathing"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(
            text=(
                "Let's try a short breathing exercise. Breathe in slowly for 4 counts, "
                "hold for 2 counts, and breathe out for 6 counts. Repeat this three times."
            )
        )
        return []
