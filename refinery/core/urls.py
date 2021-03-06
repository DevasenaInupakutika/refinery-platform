'''
Created on Feb 20, 2012

@author: nils
'''

from django.conf.urls.defaults import patterns, url


urlpatterns = patterns('core.views',
    url(r'^$', 'home', name="home" ),        
    url(r'^about/$', 'about', name="about" ),
    url(r'^contact/$', 'contact', name="contact" ),
    url(r'^statistics/$', 'statistics', name="statistics" ),
    url(r'^data_set_statistics/$', 'data_set_statistics', name='data_set_statistics'),
    url(r'^project_statistics/$', 'project_statistics', name='project_statistics'),
    url(r'^workflow_statistics/$', 'workflow_statistics', name='workflow_statistics'),
    url(r'^users/(?P<query>[\@\.\-\+a-z0-9]+)/$', 'user'),
        # "name" is required for use with the url tag in templates
    url(r'^users/(?P<query>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'user', name="user"),
    url(r'^users/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/edit/$', 'user_edit', name="user_edit"),
    url(r'^groups/(?P<query>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'group', name="group"),
    url(r'^projects/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'project', name="project"),
    url(r'^projects/new/$', 'project_new', name="project_new"),
    url(r'^projects/(?P<slug>[a-zA-Z0-9\_]+)/$', 'project_slug', name="project_slug"),
    url(r'^projects/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/edit/$', 'project_edit', name="project_edit"),
    url(r'^analyses/$', 'analyses', name="analyses"),
    url(r'^analyses/(?P<analysis_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'analysis', name="analysis"),
    url(r'^data_sets/$', 'data_sets'),
    url(r'^data_sets/(?P<data_set_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'data_set', name="data_set"),
    url(r'^data_sets/(?P<data_set_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/analysis/(?P<analysis_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'data_set', name="data_set_analysis"),
    url(r'^data_sets/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/edit/$', 'data_set_edit', name="data_set_edit"),
    url(r'^data_sets/(?P<slug>[a-zA-Z0-9\_]+)/$', 'data_set_slug', name="data_set_slug"),
    url(r'^workflows/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'workflow', name="workflow"),
    url(r'^workflows/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/edit/$', 'workflow_edit', name="workflow_edit"),
    url(r'^workflows/(?P<slug>[a-zA-Z0-9\_]+)/$', 'workflow_slug', name="workflow_slug"),    
    url(r'^workflow_engines/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'workflow_engine', name="workflow_engine"),

    url(r'^data_sets/(?P<ds_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/samples/(?P<study_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/(?P<assay_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'samples', name="samples"),
        
    url(r'^solr/igv/$', 'solr_igv' ),
    url(r'^solr/(?P<core>.+)/select/$', 'solr_select', name="solr_select"),
    
    # test solr/search view
    url(r'^data_sets/(?P<ds_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/samples/(?P<study_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/(?P<assay_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/solr$', 'samples_solr', name="samples"),
)


"""
class DataSetList(ListView):
    def get_queryset(self):
        return get_objects_for_user(self.request.user, "core.read_dataset")

urlpatterns += patterns('',
    url(r'^data_sets/$',
        DataSetList.as_view(
            context_object_name='datasets',
            paginate_by=15,
            template_name='core/data_sets.html'
        ))              
)
"""
