/**
 * Created by Praimen on 5/25/2018.
 */
$(function(){

    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        var results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    };

    $('button.view-btn').on('click',function(){

        if(getUrlParameter('draft') == 'true'){
            window.location = '/policy-list?draft=true';
        }else{
            window.location = '/policy-list';
        }
    })

    $('button.edit-btn').on('click',function(){
        var URLArr = window.location.pathname.split('/');
        var policyNumber = URLArr[2];
        if(getUrlParameter('draft') == 'true'){
            window.location = '/editor-test/'+policyNumber+'?draft=true';
        }else{
            window.location = '/editor-test/'+policyNumber;
        }

    })

});