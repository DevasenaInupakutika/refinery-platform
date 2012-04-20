'''
Created on Apr 15, 2012

@author: nils
'''

from django.forms import ModelForm, Textarea
from core.models import Project

class ProjectForm(ModelForm):
    class Meta:
        model = Project
        widgets = {
            'description': Textarea(attrs={'cols': 80, 'rows': 20}),
        }   