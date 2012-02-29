from django.core.management.base import LabelCommand
from django.conf import settings
from refinery.refinery_repository.models import *
import csv, sys, re, string, os, glob
from collections import defaultdict
from django.conf import settings

class Command(LabelCommand):
    
    help = "Takes the directory of an ISA-Tab file as input, parses, and"
    help = "%s inputs it into the database" % help
    
    args = '[isatab_directory ...]'


    """
    Name: handle_label
    Description:
        main program; calls the parsing and insertion functions
    """   
    def handle_label(self, label, **options):
        
        """
        Name: get_subtype
        Description:
            extracts the sub-type from the Characteristic or Factor Value
            header
        Parameters:
            field: the text from the header field that's being parsed
        """
        def get_subtype(field):
            #get the positions of the [] that surround the sub-type
            left_bracket = string.index(field, '[')
            right_bracket = string.rindex(field, ']')
            
            #get everything between [] and uppercase it
            subtype = field[left_bracket+1:right_bracket].upper()
            
            #substitute spaces with underscores
            sub_type = string.join(string.split(subtype, ' '), '_')
            #return the sub-type
            return sub_type 
    
        """
        Name: insert_subtype
        Description:
            inserts the sub-type from the Characteristic or Factor Value
            header into a Django model
        Parameters:
            subtypes: an array of all the sub-types that need to be inserted 
        """
        def insert_subtype(subtypes):
            s = SubType(type=subtypes)
            s.save()
            return s
    
        """
        Name: parse_investigation_file
        Description:
            parse the fields relevant to our Django model and put them into a
            dictionary
        Parameters:
            i_file: path to investigation file
        """
        def parse_investigation_file(i_file):
            invest_info = {
                           'tor': defaultdict(list), #investigator
                           'tion': defaultdict(list), #investigation
                           'ont': defaultdict(list), #ontology
                           'sdd': defaultdict(list), #study design descriptor
                           'sf': defaultdict(list), #study factor
                           'prot': defaultdict(list), #protocol
                           'pub': defaultdict(list) #publication
                           }
            #read in investigation file
            file_reader = open(i_file, 'rb')
            
            #grab the investigation file values
            current_header = ""
            for row in file_reader:
                #list comprehension that splits on tabs and strips each
                #element of the array of flanking whitespace
                fields = [x.strip() for x in string.split(row, '\t')]
                #if all caps, designate the dictionary the information will go into
                if re.search(r'[A-Z]{4}', fields[0]): #not a section header
                    if re.search(r'ONTOLOGY SOURCE REFERENCE', row):
                        current_header = 'ont'
                    elif re.search(r'INVESTIGATION', row):
                        current_header = 'investigation'
                    elif re.search(r'STUDY DESIGN', row):
                        current_header = 'sdd'
                    elif re.search(r'STUDY PUBLICATIONS', row):
                        current_header = 'pub'
                    elif re.search(r'STUDY FACTORS', row):
                        current_header = 'sf'
                    elif re.search(r'STUDY PROTOCOLS', row):
                        current_header = 'prot'
                    elif re.search(r'STUDY CONTACTS', row):
                        current_header = 'tor'
                    elif re.search(r'STUDY ASSAYS', row) or re.search(r'STUDY', row):
                        current_header = 'tion'   
                else: #if an information row, then push the information into the dictionary
                    if not current_header == 'investigation':
                        #database columns are the header names, made lower
                        #case and joined by "_" (e.g. study_title)
                        name = fields.pop(0).lower()
                        db_col = string.join(string.split(name, ' '), '_')
                        if(db_col):
                            invest_info[current_header][db_col] = fields
                    
            #after finished grabbing information, organize it into lists of 
            #dictionaries
            key_terms = { #important terms to each dictionary
                         'ont': 'term_source_name',
                         'tor': 'study_person_email',
                         'sdd': 'study_design_type',
                         'sf': 'study_factor_name',
                         'pub': 'study_pubmed_id',
                         'prot': 'study_protocol_name',
                         'tion': 'study_identifier'
                         }
            investigation = defaultdict(list) #object to return
            for k, v in invest_info.items(): #v is dict of lists
                indexes = list() #indexes that have information to grab
                for i, val in enumerate(v[key_terms[k]]):
                    if val: #make sure val not empty
                        indexes.append(i)
                for i in indexes:
                    temp_dict = dict()
                    #inv_key (e.g. study_person_fax, study_protocol_name, etc)
                    for inv_key, inv_list in v.items():
                        try:
                            temp_dict[inv_key] = inv_list[i]
                        except IndexError:
                            temp_dict[inv_key] = ''
                    investigation[k].append(temp_dict)
            
            return investigation

        """
        Name: insert_investigation
        Description:
            inserts investigation information & investigator information
        Parameters:
            i_dict: dictionary of investigation file
        """
        def insert_investigation(i_dict):
            tor_list = i_dict['tor'] #investigator
            tion_dict = i_dict['tion'][0] #investigation
            ont_list = i_dict['ont'] #ontology
            prot_list = i_dict['prot'] #protocols
            sdd_list = i_dict['sdd'] #study design descriptors
            sf_list = i_dict['sf'] #study factors
            pub_list = i_dict['pub'] #publications

            # "**" converts dictionary to arguments
            #make sure dates are datetime.date objects
            for k, v in tion_dict.items():
                if re.search(r'_date', k):
                    try:
                        the_date = datetime.strptime(v, '%Y-%m-%d').date()
                    except ValueError:
                        the_date = ''
                    tion_dict[k] = the_date
            del tion_dict['study_submission_date']

            investigation = Investigation(**tion_dict)
            investigation.save()
            
            #add investigation to tor dictionary and insert investigator(s)
            
            for tor_dict in tor_list:
                investigator = Investigator(**tor_dict)
                investigator.save()
                    
                #add investigation to investigator
                investigator.investigations.add(investigation)

            #add investigation to ont dictionary and insert ontology/ontologies
            for ont_dict in ont_list:
                ontology = Ontology(**ont_dict)
                ontology.save()
                    
                #add investigation to ontology
                ontology.investigation_set.add(investigation)
                    
            #add investigation to pub dictionary and insert publication(s)
            for pub_dict in pub_list:
                #using foreign key, so need to assign
                pub_dict['investigation'] = investigation
                publication = Publication(**pub_dict)
                publication.save()
                    
            #add investigation to prot dictionary and insert protocol(s)
            for prot_dict in prot_list:
                protocol = Protocol(**prot_dict)
                protocol.save()
                    
                #add investigation to protocol
                protocol.investigation_set.add(investigation)
            
            #add investigation to sdd dictionary and insert study design descriptor(s)
            for sdd_dict in sdd_list:
                sdd = StudyDesignDescriptor(**sdd_dict)
                sdd.save()
                
                #add investigation to sdd
                sdd.investigation_set.add(investigation)
                    
            #add investigation to prot dictionary and insert protocol(s)
            for sf_dict in sf_list:
                sf = StudyFactor(**sf_dict)
                try:
                    sf.save()
                except:
                    sf = StudyFactor.objects.get(
                            study_factor_name=sf_dict['study_factor_name'],
                            study_factor_type=sf_dict['study_factor_type']
                            )
                #add investigation to protocol
                sf.investigation_set.add(investigation)

            return investigation

        """
        Name: parse_study_file
        Description:
            parse the fields relevant to our Django model and put them into a
            dictionary
        Parameters:
            s_file: path to study file
        """
        def parse_study_file(s_file):
            #dictionary of dictionary of lists
            study_info = {
                          'study': defaultdict(list),
                          'comment': defaultdict(list),
                          'characteristics': defaultdict(list),
                          'protocol': list()
                          }
            
            #read in study file
            file_reader = csv.reader(open(s_file, 'rb'), dialect='excel-tab')
    
            #grab first row to get field headers
            header_row = file_reader.next()
            #dictionary that correlates column index and header text
            header = dict()
            for i, j in enumerate(header_row):
                if re.search(r'Term Source REF', j):
                    header[i] = "%s %s" % (str(i - 1), j)
                elif re.search(r'Term Accession Number', j):
                    header[i] = "%s %s" % (str(i - 2), j)
                else:
                    header[i] = j
            
            #iterate over the file
            for i, row in enumerate(file_reader):
                #some data structures for special cases
                protocols = list()
                #each row is a dictionary, so iterate over that
                for j, field in enumerate(row):
                    #comment or characteristic
                    if re.search(r"\[.+\]", header[j]):
                        #return everything before '[' and lowercase it
                        key = string.split(header[j], '[').pop(0).lower().strip()
                        sub_key = get_subtype(header[j])
                        subtype = insert_subtype(sub_key)
                        
                        if re.search(r'Characteristics', header[j]):
                            temp = dict()
                            temp['value'] = field
                            study_info[key][sub_key].append(temp)
                        else:
                            study_info[key][sub_key].append(field)
                    elif re.search(r'^[0-9]+ Term', header[j]):
                        #isolate index of corresponding characteristic
                        #and prepare to substitute underscores for spaces
                        split = string.split(header[j], ' ')
                        #get Characteristics[something]
                        char = header[int(split.pop(0))]
                        sub_type = get_subtype(char)
                        #key is the key for study_info
                        key = string.split(char, '[').pop(0).lower().strip()
                        #field header
                        sub_key = string.join(split, '_').lower()
                        
                        #'i' is the row index; position of subtype list 
                        study_info[key][sub_type][i][sub_key] = field
                    else:
                        #get name of the header with '_' substituted for ' ' and lowercase
                        key_parts = [x.lower().strip() for x in string.split(header[j], ' ')]
                        key = string.join(key_parts, '_')
                        
                        if re.search(r'Protocol ', header[j]):
                            protocols.append(field)
                        else:
                            study_info['study'][key].append(field)
                study_info['protocol'].append(protocols)
    
            return study_info
        
        """
        Name: insert_study
        Description:
            insert study information
        Parameters:
            s_dict: dictionary of study file
            investigation: corresponding investigation
            protocols: dictionary of protocols and abbreviations
        """
        def insert_study(investigation, s_dict, protocols):
            comment_dict = s_dict['comment']
            study_dict = s_dict['study']
            char_dict = s_dict['characteristics']
            prot_list = s_dict['protocol']
            
            #list of studies entered, needs to be returned
            study_list = list()
            
            #insert studies
            while len(study_dict['source_name']):
                temp = dict()
                for k, s in study_dict.items():
                    temp[k] = s.pop(0)
                temp['investigation'] = investigation
                
                study = Study(**temp)
                study.save()
                study_list.append(study)
            
            #insert comments
            for s in study_list:
                for k, v in comment_dict.items():
                    sub_type = SubType.objects.get(pk=k)
                    comment = Comment(value=v.pop(0), study=s, type=sub_type)
                    #comment.save()
                    
            #insert characteristics
            for s in study_list:
                for k, v in char_dict.items():
                    characteristic = v.pop(0)
                    characteristic['study'] = s
                    
                    sub_type = SubType.objects.get(pk=k)
                    characteristic['type'] = sub_type
                    char = Characteristic(**characteristic)
                    #char.save()
            
            #insert protocols
            #zip lets you iterate through two lists in parallel
            for s, p in zip(study_list, prot_list):
                for prot in p:
                    #s.protocols.add(protocols[prot])
                    self

            return study_list
   
        def get_raw_url(ftp_file):
            #list that has different parts of final ftp link to concatenate
            ftp = ["ftp://ftp.sra.ebi.ac.uk/vol1/fastq"]
    
            """isolate the file name"""
            #get the index of the last / in the given ftp link
            rind = string.rindex(ftp_file, '/')
            #take substring from the last slash to the end of given ftp link
            f_name = ftp_file[rind+1:] #file name
    
            #add first 6 characters of the ENA/SRA accession to list
            ftp.append(f_name[:6])
    
            #isolate the ENA/SRA accession number
            split = f_name.split('.') #split on "." for ENA/SRA acc (ind=0)
            #if paired-end data, remove the _1/_2 from end before list append
            if re.search(r'_(1|2)$', split[0]):
                #add everything but last 2 chars (_1 or _2)
                ftp.append(split[0][:-2])
            else:
                ftp.append(split[0]) 
    
            #if getting FASTQ file, make sure gzip version
            if re.search(r'\.fastq$', f_name):
                f_name += ".gz"
            #add file name to the end of the list
            ftp.append(f_name)
    
            #concatenate everything to get the final FTP link
            ftp_url = string.join(ftp, '/')
            return ftp_url

        def get_processed_url(ftp_file, acc):
            #isolate the file name
            #get the index of the last / in the given ftp link
            rind = string.rindex(ftp_file, '/')
            #take substring from the last slash to the end of given ftp link
            f_name = ftp_file[rind+1:] #file name
    
            #format final url, plugging in the accession and the file name
            url = "http://www.ebi.ac.uk/arrayexpress/files"
            url = "%s/%s/%s" % (url, acc, f_name)
            return url
            
        """
        Name: parse_assay_file
        Description:
            parse the fields relevant to our Django model and put them into a
            dictionary
        Parameters:
            a_file: path to assay file
            accession: associated investigation study identifier
        """
        def parse_assay_file(a_file, accession):
            assay_info = {
                          'raw_data': list(),
                          'processed_data': list(),
                          'have_subtype': list(),
                          'factor_value': list(),
                          'protocol': list(),
                          'comment': list(),
                          'assay': list()
                          }
            #read in assay file, can't use dictionary because keys may be 
            #potentially overwritten
            file_reader = csv.reader(open(a_file, 'rb'), dialect='excel-tab')
            
            #grab first row to get field headers
            header_row = file_reader.next()
            #dictionary that correlates column index and header text
            header = dict()
            for i, j in enumerate(header_row):
                if re.search(r'Term Source REF', j):
                    header[i] = "%s %s" % (str(i - 1), j)
                elif re.search(r'Term Accession Number', j):
                    header[i] = "%s %s" % (str(i - 2), j)
                elif re.search(r'Derived ArrayExpress FTP file', j):
                    header[i] = 'Derived ArrayExpress FTP file'
                else:
                    header[i] = j
            
            for i, row in enumerate(file_reader):
                protocols = list()
                dictionary = defaultdict(dict)
                for j, field in enumerate(row):
                    if not re.search(r'^\s*$', field):
                        if re.search(r'FASTQ URI', header[j]) or re.search(r'Raw Data', header[j]):
                            raw_file = get_raw_url(field)
                            dictionary['r']['raw_data_file'] = field
                        elif re.search(r'\[.+\]', header[j]):
                            sub_key = get_subtype(header[j])
                            subtype = insert_subtype(sub_key)
                            key = string.split(header[j], '[').pop(0).lower().strip()
                            key = re.sub(r' ', r'_', key)
                        
                            #assign values
                            try:
                                dictionary['b'][key][sub_key]['type'] = subtype
                            except KeyError:
                                dictionary['b'][key] = defaultdict(dict)
                                dictionary['b'][key][sub_key]['type'] = subtype

                            dictionary['b'][key][sub_key]['value'] = field
                        else:
                            #get name of the header with '_' substituted for ' '
                            #and lowercase
                            key_parts = [x.lower().strip() for x in string.split(header[j], ' ')]
                            key = string.join(key_parts, '_')
                        
                            if re.search(r'Derived', header[j]):
                                if re.search(r'FTP', header[j]):
                                    field = get_processed_url(field, accession)

                                dictionary['p'][key] = field
                            elif re.search(r'Protocol REF', header[j]):
                                if re.search(r'-', field):
                                    protocols.append(field)
                                else:
                                    dictionary['a'][key] = field
                            elif re.search(r'Data Transformation', header[j]):
                                dictionary['r'][key] = field
                            elif re.search(r'^[0-9]+ Term', header[j]):
                                #isolate index of corresponding characteristic
                                #and prepare to substitute '_' for ' '
                                split = string.split(header[j], ' ')
                                #get Factor Value[something]
                                fv = header[int(split.pop(0))]
                                
                                sub_type = get_subtype(fv)
                                #key is the key for study_info
                                key = string.split(fv, '[').pop(0).lower().strip()
                                key = re.sub(r' ', r'_', key)
                                #field header
                                sub_key = string.join(split, '_').lower()
                                
                                dictionary['b'][key][sub_type][sub_key] = field
                            else:
                                dictionary['a'][key] = field
                    
                assay_info['protocol'].append(protocols)
                
                #assign row number to end of dict so we know what's together
                for k, v in dictionary.items():
                    v['row_num'] = i
                assay_info['raw_data'].append(dictionary['r'])
                assay_info['assay'].append(dictionary['a'])
                assay_info['processed_data'].append(dictionary['p'])
                
                #can't iterate an int, so delete and re-add later
                del dictionary['b']['row_num']
                
                #organize bracketed items into proper categories
                for d in dictionary['b']:
                    for k in dictionary['b'][d]:
                        temp = dictionary['b'][d][k]
                        temp['row_num'] = i
                        if not (re.search(r'comment', d) or re.search(r'factor', d)):
                            temp['super_type'] = d
                            assay_info['have_subtype'].append(temp)
                        else:
                            assay_info[d].append(temp)

            return assay_info
    
        """
        Name: insert_assay
        Description:
            insert study and assay information
        Parameters:
            investigation: corresponding investigation
            s_list: list of associated study objects
            a_dict: dictionary of assay file
            protocols: dictionary of protocols and abbreviations
        """
        def insert_assay(investigation, s_list, a_dict, protocols):
            comment_list = a_dict['comment']
            assay_list = a_dict['assay']
            raw_list = a_dict['raw_data']
            processed_list = a_dict['processed_data']
            fv_list = a_dict['factor_value']
            hs_list = a_dict['have_subtype']
            prot_list = a_dict['protocol']
            
            print '\n assay \n'
            assay_dict = dict()
            for a in assay_list:
                print a
            
            print '\n comment \n'    
            for c in comment_list:
                print c
            
            print '\n factor value \n'
            for fv in fv_list:
                print fv
                
            print '\n have subtype \n'
            for hs in hs_list:
                print hs
                
            print '\n raw \n'
            for r in raw_list:
                print r
            
            print '\n processed \n'
            for p in processed_list:
                print p


        """ main program starts """
        #CHANGE ME!!!
        #base_dir = "/Users/psalmhaseley/Documents/isa-tab/cnvrt"
        base_dir = settings.ISA_TAB_DIR;

        isa_ref = label
        print label
        
        isa_dir = os.path.join(base_dir, isa_ref)
        
        assert os.path.isdir(isa_dir), "Invalid Accession: %s" % isa_ref

        #assign files to proper file locations and make sure they're correct    
        investigation_file = "%s/i_%s_investigation.txt" % (isa_dir, isa_ref)
        assert os.path.exists(investigation_file), "%s" % investigation_file
        
        study_file = "%s/s_%s_studysample.txt" % (isa_dir, isa_ref)
        assert os.path.exists(study_file), "Not study file %s" % study_file
        
        assay_file = "%s/a_%s_assay.txt" % (isa_dir, isa_ref)
        assert os.path.exists(assay_file), "Not assay file %s" % assay_file

        #investigation_dict = parse_investigation_file(investigation_file)
        #investigation = insert_investigation(investigation_dict)
        investigation = Investigation.objects.get(pk='E-GEOD-18588')
        
        #get a dictionary of possible protocol names in the studies and assays
        #so it's easier to associate them to the originals
        protocol_list = investigation.protocols.all()
        protocols = dict()
        for p in protocol_list:
            name = p.study_protocol_name
            protocols[name] = p
            #create an abbreviated name
            #get the number on the end of the full protocol name
            number = string.split(name, '-').pop()
            abbr = "P--%s" % number
            protocols[abbr] = p
        
        #study_dict = parse_study_file(study_file)
        #studys_list = insert_study(investigation, study_dict, protocols)
        studys_list = investigation.study_set.all()
    
        assay_dict = parse_assay_file(assay_file, investigation.study_identifier)
        insert_assay(investigation, studys_list, assay_dict, protocols)