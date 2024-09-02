from django.urls import path
from .consumers import ChatConsumer, MeetingConsumer

websocket_urlpatterns = [
    path('ws/notification/<str:room_name>/', ChatConsumer.as_asgi()),
    path('', MeetingConsumer.as_asgi()),
]