"""
WhatsApp Cloud API webhook — handles verification + incoming messages.
"""
import json
import logging

import urllib.request
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from apps.clinic.models import ClinicSettings

from .bot import handle_message

logger = logging.getLogger(__name__)


@require_GET
def webhook_verify(request):
    """Meta webhook verification (GET with hub.challenge)."""
    mode = request.GET.get('hub.mode')
    token = request.GET.get('hub.verify_token')
    challenge = request.GET.get('hub.challenge')

    settings = ClinicSettings.load()
    if mode == 'subscribe' and token == settings.wa_verify_token:
        return HttpResponse(challenge, content_type='text/plain')
    return HttpResponse('Forbidden', status=403)


def _send_whatsapp(to: str, text: str):
    """Send a text message via WhatsApp Cloud API."""
    settings = ClinicSettings.load()
    if not settings.wa_api_token or not settings.wa_phone_number_id:
        logger.warning('WhatsApp API not configured — message not sent to %s', to)
        return

    url = f'https://graph.facebook.com/v21.0/{settings.wa_phone_number_id}/messages'
    payload = json.dumps({
        'messaging_product': 'whatsapp',
        'to': to,
        'type': 'text',
        'text': {'body': text},
    }).encode()

    req = urllib.request.Request(url, data=payload, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Authorization', f'Bearer {settings.wa_api_token}')
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            logger.info('WA message sent to %s — %s', to, resp.status)
    except Exception as e:
        logger.error('Failed to send WA message to %s: %s', to, e)


@csrf_exempt
@require_http_methods(['GET', 'POST'])
def webhook(request):
    """Combined endpoint: GET for verification, POST for incoming messages."""
    if request.method == 'GET':
        return webhook_verify(request)

    settings = ClinicSettings.load()
    if not settings.wa_bot_enabled:
        return JsonResponse({'status': 'bot disabled'})

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'status': 'bad json'}, status=400)

    for entry in body.get('entry', []):
        for change in entry.get('changes', []):
            value = change.get('value', {})
            for msg in value.get('messages', []):
                if msg.get('type') != 'text':
                    continue
                wa_id = msg['from']
                text = msg['text']['body']
                reply = handle_message(wa_id, text)
                _send_whatsapp(wa_id, reply)

    return JsonResponse({'status': 'ok'})
