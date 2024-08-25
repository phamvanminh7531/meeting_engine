from django.db import models

# Create your models here.
class Room(models.Model):
    room_name = models.CharField(max_length=255)
    client_count = models.IntegerField(default=0)

    def __str__(self) -> str:
        return str(self.room_name)

class Message(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    sender = models.CharField(max_length=255)
    message = models.TextField()
    

    def __str__(self) -> str:
        return str(self.sender)