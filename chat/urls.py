from . import views
from django.urls import path

app_name = 'chat_app'

urlpatterns = [
    path('', views.CreateRoom, name='create-room'),
    path('<str:room_name>/<str:username>/', views.MessageView, name='room'),
    path('share/', views.ShareScreen, name='share'),
    path('meeting/', views.Meeting, name='meeting'),
]