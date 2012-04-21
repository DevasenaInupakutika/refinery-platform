from django.db import models
from django_extensions.db.fields import UUIDField
from celery.result import TaskSetResult 
from celery.result import AsyncResult

'''
http://permalink.gmane.org/gmane.comp.python.amqp.celery.user/2036

from celery.task import TaskSet
   from celery.result import TaskSetResult

   ts_result = TaskSet(add.subtask((i, i)) for i in
xrange(10)).apply_async()
   ts_result.save()
   taskset_id = ts_result.taskset_id

   # later
   ts_result = TaskSetResult.restore(taskset_id)
'''

class AnalysisStatus( models.Model ):
    analysis_uuid = UUIDField( unique=True, auto=False )
    
    preprocessing_taskset_id = UUIDField( blank=True, null=True, auto=False )
    execution_taskset_id = UUIDField( blank=True, null=True, auto=False )
    postprocessing_taskset_id = UUIDField( blank=True, null=True, auto=False )
    cleanup_taskset_id = UUIDField( blank=True, null=True, auto=False )
    execution_monitor_task_id = UUIDField( blank=True, null=True, auto=False )
    
    def preprocessing_status(self):
        return getPayload(self.preprocessing_taskset_id)
    
    def execution_status(self):
        return getPayload(self.execution_monitor_task_id)
    
    def postprocessing_status(self):
        return getPayload(self.postprocessing_taskset_id)
    
    def cleanup_status(self):
        return getPayload(self.cleanup_taskset_id)
  
        
    """
    def current(self):        
        preprocessing_result = False
        execution_result = False
        postprocessing_result = False
        cleanup_result = False
        execution_monitor_result = False
        
        if not self.preprocessing_taskset_id is None:
            preprocessing_taskset = AsyncResult( self.preprocessing_taskset_id )
            
            print "getPayload: preprocessing_taskset"
            test = getPayload(self.preprocessing_taskset_id)
            
            if preprocessing_taskset is not None:
                preprocessing_taskset = preprocessing_taskset.state
            
        if not self.execution_taskset_id is None:
            execution_taskset = AsyncResult( self.execution_taskset_id )
            print "getPayload: execution_taskset"
            test = getPayload(self.execution_taskset_id)
            
            if execution_taskset is not None:
                execution_result = execution_taskset.state
            
        if not self.execution_taskset_id is None:            
            postprocessing_taskset = AsyncResult( self.postprocessing_taskset_id )
            print "getPayload: postprocessing_taskset"
            test = getPayload(self.postprocessing_taskset_id)
            
            if postprocessing_taskset is not None:
                postprocessing_result = postprocessing_taskset.state
        
        if not self.cleanup_taskset_id is None:            
            #cleanup_taskset = AsyncResult( self.cleanup_taskset_id )
            print "getPayload: cleanup_taskset"
            test = getPayload(self.cleanup_taskset_id)
            
        if not self.execution_monitor_task_id is None:            
            execution_monitor_taskset = AsyncResult( self.execution_monitor_task_id )
            print "getPayload: execution_monitor_taskset"
            test = getPayload(self.execution_monitor_task_id)
            if execution_monitor_taskset is not None:
                execution_monitor_result = execution_monitor_taskset.state
        
        #print "analysis_manager current called"
        # TO DEBUG PYTHON WEBAPPS ##
        #import pdb; pdb.set_trace()
       # print 
        #import pdb; pdb.set_trace()
            
        
        #return { "preprocessing": preprocessing_result, "preprocessing_tasks": preprocessing_subtasks, "execution": execution_result, "postprocessing": postprocessing_result } 
        return { "preprocessing": preprocessing_result, "execution": execution_result, "postprocessing": postprocessing_result, "execution_monitor":execution_monitor_result, "cleanup":cleanup_result } 
"""

def getPayload(ts_id):
    
    payload = []
    ts = AsyncResult( ts_id )
    if ts:
        #print "*******"
        #print ts
        if ts.result:
           # print ">>>>>>"
            #print ts.result
            #print "&&&&&&&&"
            if type(ts.result) ==type(dict()):
                temp_ret = ts.result['message']
                temp_ret['state'] = ts.state
                payload.append(temp_ret)
            elif (ts.result.__class__.__name__ == 'TaskSetResult'):
                #print "        $$$$$$$$"
                #print ts.result.successful()
                #print ts.result.ready()
                #print ts.result.results
                n_tasks = len(ts.result.results)
                if n_tasks > 0:
                    #print "Greater than 0 tas"
                    #print n_tasks
                    #import pdb; pdb.set_trace()   

                    for j in range(0,n_tasks):
                        #print "\t \t jjjjjjj:" + str(j)
                        temp_ret = {};
                        if ts.result.results[j].result:
                            temp_ret = ts.result.results[j].result
                            temp_ret['state'] = ts.result.results[j].state
                            payload.append(temp_ret)
                            #payload.append(ts.result.results[j].result)
                            #print ts.result.results[j].state
                        else:
                            #print "elseelseelseelseelseelse "
                            #import pdb; pdb.set_trace()
                            temp_ret['state'] = ts.result.results[j].state
                            payload.append(temp_ret)
                #else:
                #    print "00000 tasks"
                #    print ts.result
            else:
                #print " ))))))))))) \t \ tDIFFERENT TYPE"
                temp_ret = {'state':ts.state, 'info':ts.result}
                payload.append(temp_ret)
                #print ts.result
        else:
            #print "<<<<<<<<<<<<<<<<<< "
            #temp_ret
            temp_ret = {'state':ts.state}
            payload.append(temp_ret)
    else:
        print "!!!!nottstststststst"
        print ts
        temp_ret = {'state':"### WAITING ###"}
        payload.append(temp_ret)
    
    #print "payload called"
    print "################################"
    print payload 
    #print len(payload)
    print "################################"
    
            
    return payload

