from django.db import models

# Create your models here.
""" tables created from investigation file """
class Ontology(models.Model):
    def __unicode__(self):
        return self.term_source_name
    
    term_source_name = models.CharField(max_length=50)
    term_source_version = models.CharField(max_length=10, blank=True, null=True)
    term_source_file = models.CharField(max_length=1024, primary_key=True)
    term_source_description = models.CharField(max_length=2048, blank=True, null=True)
    
    class Meta:
        #even though pk is an auto-incremented number, ensures every row has a
        #unique combination of these two fields
        unique_together = ('term_source_name', 'term_source_file')

class StudyDesignDescriptor(models.Model):
    def __unicode__(self):
        return self.study_design_type
    
    study_design_type = models.CharField(max_length=255, primary_key=True)
    study_design_type_term_accession_number = models.CharField(max_length=255, blank=True, null=True)
    study_design_type_term_source_ref = models.CharField(max_length=1024, blank=True, null=True)

class StudyFactor(models.Model):
    def __unicode__(self):
        return self.study_factor_name
    
    study_factor_name = models.CharField(max_length=50)
    study_factor_type = models.CharField(max_length=50)
    study_factor_type_term_accession_number = models.CharField(max_length=255, blank=True, null=True)
    study_factor_type_term_source_ref = models.CharField(max_length=1024, blank=True, null=True)
    
    class Meta:
        unique_together = ('study_factor_name', 'study_factor_type')

class Protocol(models.Model):
    def __unicode__(self):
        return self.study_protocol_name
    
    study_protocol_name = models.CharField(max_length=100, primary_key=True)
    study_protocol_type = models.CharField(max_length=100, blank=True, null=True)
    study_protocol_type_term_accession_number = models.CharField(max_length=255, blank=True, null=True)
    study_protocol_type_term_source_ref = models.CharField(max_length=1024, blank=True, null=True)
    study_protocol_description = models.CharField(max_length=2048, blank=True, null=True)
    study_protocol_uri = models.CharField(max_length=1024, blank=True, null=True)
    study_protocol_version = models.CharField(max_length=50, blank=True, null=True)
    study_protocol_parameters_name = models.CharField(max_length=50, blank=True, null=True)
    study_protocol_parameters_name_term_accession_number = models.CharField(max_length=255, blank=True, null=True)
    study_protocol_parameters_name_term_source_ref = models.CharField(max_length=1024, blank=True, null=True)
    study_protocol_components_name = models.CharField(max_length=50, blank=True, null=True)
    study_protocol_components_type = models.CharField(max_length=50, blank=True, null=True)
    study_protocol_components_type_term_accession_number = models.CharField(max_length=255, blank=True, null=True)
    study_protocol_components_type_term_source_ref = models.CharField(max_length=1024, blank=True, null=True)

class Investigation(models.Model):
    def __unicode__(self):
        return self.study_identifier

    study_identifier = models.CharField(max_length=20, primary_key=True)
    study_title = models.CharField(max_length=255)
    study_description = models.CharField(max_length=2048)
    study_public_release_date = models.DateField(blank=True, null=True)
    #study_submission_date = models.DateField(blank=True, null=True)
    study_file_name = models.CharField(max_length=50)
    #assay attributes
    study_assay_measurement_type = models.CharField(max_length=255, blank=True, null=True)
    study_assay_measurement_type_term_accession_number = models.CharField(max_length=255, blank=True, null=True)
    study_assay_measurement_type_term_source_ref = models.CharField(max_length=1024, blank=True, null=True)
    study_assay_technology_type = models.CharField(max_length=255, blank=True, null=True)
    study_assay_technology_type_term_accession_number = models.CharField(max_length=255, blank=True, null=True)
    study_assay_technology_type_term_source_ref = models.CharField(max_length=255, blank=True, null=True)
    study_assay_technology_platform = models.CharField(max_length=255, blank=True, null=True)
    study_assay_file_name = models.CharField(max_length=50)
    
    #0, 1, or more ontologies can be used for many different investigations
    ontologies = models.ManyToManyField(Ontology, blank=True, null=True)
    #an investigation can have 0, 1, or more study_factors
    study_factors = models.ManyToManyField(StudyFactor, blank=True, null=True)
    #one or more study_design_descriptors can be used for different investigations
    study_design_descriptors = models.ManyToManyField(StudyDesignDescriptor)
    protocols = models.ManyToManyField(Protocol)
    
class Publication(models.Model):
    def __unicode__(self):
        return self.study_pubmed_id
    
    study_pubmed_id = models.IntegerField(primary_key=True)
    study_publication_doi = models.CharField(max_length=50, blank=True, null=True)
    study_publication_author_list = models.CharField(max_length=1024, blank=True, null=True)
    study_publication_title = models.CharField(max_length=255, blank=True, null=True)
    study_publication_status = models.CharField(max_length=50, blank=True, null=True)
    study_publication_status_term_accession_number = models.CharField(max_length=255, blank=True, null=True)
    study_publication_status_term_source_ref = models.CharField(max_length=1024, blank=True, null=True)

    investigation = models.ForeignKey(Investigation)

class Investigator(models.Model):
    def __unicode__(self):
        name = "%s, %s %s" % (self.study_person_last_name, 
                              self.study_person_first_name, 
                              self.study_person_mid_initials)
        return name

    study_person_email = models.EmailField(max_length=255, primary_key=True)
    study_person_last_name = models.CharField(max_length=100)
    study_person_first_name = models.CharField(max_length=100)
    study_person_mid_initials = models.CharField(max_length=1, blank=True, null=True)
    study_person_phone = models.CharField(max_length=50)
    study_person_fax = models.CharField(max_length=50, blank=True, null=True)
    study_person_address = models.CharField(max_length=1024)
    study_person_affiliation = models.CharField(max_length=50)
    study_person_roles = models.CharField(max_length=255)
    study_person_roles_term_accession_number = models.CharField(max_length=255, blank=True, null=True)
    study_person_roles_term_source_ref = models.CharField(max_length=1024, blank=True, null=True)
    
    investigations = models.ManyToManyField(Investigation)
    

""" tables created from study or assay file """
class SubType(models.Model):
    def __unicode__(self):
        return self.type

    type = models.CharField(max_length=255, primary_key=True)

class Comment(models.Model):
    value = models.CharField(max_length=1024)
    type = models.ForeignKey(SubType)
    
    #comments can belong to both studies and assays, but only one at a time
    #so make both "optional" so that only one needs specifying at a time
    study = models.ForeignKey('Study', blank=True, null=True)
    assay = models.ForeignKey('Assay', blank=True, null=True)

    
""" tables created from study file """
class Study(models.Model):
    def __unicode__(self):
        return self.source_name
    source_name = models.CharField(max_length=255, primary_key=True)
    sample_name = models.CharField(max_length=255)
    material_type = models.CharField(max_length=255, blank=True, null=True)
    provider = models.CharField(max_length=255, blank=True, null=True) 
    
    #usually more than one protocol per study
    protocols = models.ManyToManyField(Protocol)
    investigation = models.ForeignKey(Investigation)

class Characteristic(models.Model):
    def __unicode__(self):
        return "%s: %s" % (self.type.type, self.value)

    value = models.CharField(max_length=1024)
    term_source_ref = models.CharField(max_length=20, blank=True, null=True)
    term_accession_number = models.CharField(max_length=1024, blank=True, null=True)
    
    type = models.ForeignKey(SubType)
    study = models.ForeignKey(Study)

    
""" tables created from assay file """   
class RawData(models.Model):
    def __unicode__(self):
        return self.raw_data_file

    raw_data_file = models.CharField(max_length=2048)
    data_transformation_name = models.CharField(max_length=1024)

class ProcessedData(models.Model):
    def __unicode__(self):
        return self.url

    derived_arrayexpress_ftp_file = models.CharField(max_length=2048)
    derived_array_data_file = models.CharField(max_length=1024)
    
class Assay(models.Model):
    def __unicode__(self):
        return self.name

    sample_name = models.CharField(max_length=255)
    material_type = models.CharField(max_length=255, blank=True, null=True)
    assay_name = models.CharField(max_length=255, blank=True, null=True)
    extract_name = models.CharField(max_length=255, blank=True, null=True)
    performer = models.CharField(max_length=255, blank=True, null=True)
    technology_type = models.CharField(max_length=255, blank=True, null=True)
    scan_name = models.CharField(max_length=255, blank=True, null=True)
    labeled_extract_name = models.CharField(max_length=255, blank=True, null=True)
    label = models.CharField(max_length=255, blank=True, null=True)
    hybridization_assay_name = models.CharField(max_length=255, blank=True, null=True)
    array_design_ref = models.CharField(max_length=255, blank=True, null=True)
    protocol_ref = models.CharField(max_length=255, blank=True, null=True)
    
    #one raw/processed data file may be associated with multiple assays
    raw_data = models.ManyToManyField(RawData, null=True, blank=True)
    processed_data = models.ManyToManyField(ProcessedData, blank=True, null=True)
    #protocols can be recycled
    protocols = models.ManyToManyField(Protocol)
    
    investigation = models.ForeignKey(Investigation)
    study = models.ForeignKey(Study)

class FactorValue(models.Model):
    def __unicode__(self):
        return "%s: %s" % (self.type.type, self.value)

    value = models.CharField(max_length=255)
    term_source_ref = models.CharField(max_length=50, blank=True, null=True)
    term_accession_number = models.CharField(max_length=1024, blank=True, null=True)
    
    type = models.ForeignKey(SubType)
    assay = models.ForeignKey(Assay)


"""can be used for anything that's not a factor value that has
the format super-type[sub-type] in the header (e.g. Parameter_Value, Unit)
"""    
class HaveSubtype(models.Model):
    def __unicode__(self):
        return "%s: %s" % (self.type, self.value)
    
    value = models.CharField(max_length=255)
    type = models.ForeignKey(SubType)
    super_type = models.CharField(max_length=255)
    assay = models.ForeignKey(Assay)
