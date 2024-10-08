import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from chat.models import *

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = f"room_{self.scope['url_route']['kwargs']['room_name']}"
        await self.channel_layer.group_add(self.room_name, self.channel_name)
        await self.accept()
        await self.increment_room_counter()
        
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_name, self.channel_name)
        await self.decrement_room_counter()

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json

        event = {
            'type': 'send_message',
            'message': message,
        }

        await self.channel_layer.group_send(self.room_name, event)

    async def send_message(self, event):

        data = event['message']
        await self.create_message(data=data)

        response_data = {
            'sender': data['sender'],
            'message': data['message']
        }
        await self.send(text_data=json.dumps({'message': response_data}))

    @database_sync_to_async
    def create_message(self, data):

        get_room_by_name = Room.objects.get(room_name=data['room_name'])
        
        if not Message.objects.filter(message=data['message']).exists():
            new_message = Message(room=get_room_by_name, sender=data['sender'], message=data['message'])
            new_message.save() 
    
    @database_sync_to_async
    def delete_room(self):
        Room.objects.filter(room_name=self.room_name).delete()
    
    @database_sync_to_async
    def increment_room_counter(self):
        room = Room.objects.get(room_name = self.scope['url_route']['kwargs']['room_name'])
        room.client_count += 1
        room.save()
    
    @database_sync_to_async
    def decrement_room_counter(self):
        room = Room.objects.get(room_name = self.scope['url_route']['kwargs']['room_name'])
        if room.client_count > 1:
            room.client_count -= 1
            room.save()
        else:
            room.delete()

class MeetingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = "test-room"

        await self.channel_layer.group_add(self.room_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_name, self.channel_name)
    
    async def receive(self, text_data):
        receive_dict = json.loads(text_data)

        action = receive_dict['action']

        if (action == 'new-offer') or (action == 'new-answer'):
            print(receive_dict)
            
            receiver_channel_name = receive_dict['message']['receiver_channel_name']
            

            receive_dict['message']['receiver_channel_name'] = self.channel_name

            await self.channel_layer.send(receiver_channel_name, {
                'type': 'send_sdp',
                'receive_dict': receive_dict,
            })

            return

        receive_dict['message']['receiver_channel_name'] = self.channel_name

        

        event = {
            'type': 'send_sdp',
            'receive_dict': receive_dict,
        }
        await self.channel_layer.group_send(self.room_name, event)
    
    async def send_sdp(self, event):

        receive_dict = event['receive_dict']
        # await self.create_message(data=data)

        response_data = {
            'receive_dict': receive_dict
        }
        await self.send(text_data=json.dumps(response_data))
