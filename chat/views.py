from django.shortcuts import render, redirect
from .models import *

def CreateRoom(request):

    if request.method == 'POST':
        username = request.POST['username']
        room = request.POST['room']

        try:
            get_room = Room.objects.get(room_name=room)
            return redirect('chat_app:room', room_name=room, username=username)

        except Room.DoesNotExist:
            new_room = Room(room_name = room)
            new_room.save()
            return redirect('chat_app:room', room_name=room, username=username)

    return render(request, 'chat/index.html')

def MessageView(request, room_name, username):

    get_room = Room.objects.get(room_name=room_name)

    if request.method == 'POST':
        message = request.POST['message']

        print(message)

        new_message = Message(room=get_room, sender=username, message=message)
        new_message.save()

    get_messages= Message.objects.filter(room=get_room)
    
    context = {
        "messages": get_messages,
        "user": username,
        "room_name": room_name,
    }
    return render(request, 'chat/message.html', context)

def ShareScreen(request):
    return render(request, 'chat/share.html')

def Meeting(request):
    context = {}
    return render(request, 'chat/meeting.html', context)