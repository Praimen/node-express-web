/**
 * Created by praimen on 5/24/2018.
 */

$(function(){
    CKEDITOR.replace( 'editor1' );

    $('<div class="preview">'+ $('#editor1').val() + '</div>').appendTo('body');

    $('button.cancel-btn').on('click',function(){
        let policyNumber = $('input[name=policynumber]').val()
        let currentVersionNum = $('input[name=currentversion]').val();
        if(policyNumber && currentVersionNum){
            window.location = '/editor-test/'+policyNumber+'/'+currentVersionNum;
        }else{
            window.location = '/editor-test/';
        }

    });

    $('button.save-btn').on('click',function(){
        $('input[name=currentversion]').val($('.version-list li').length())
        $('#policy-form').attr('action','/editor-test/').submit()
    });

    $('button.new-btn').on('click',function(){
        $('#policy-form').attr('action','/editor-test')
    });

    $('button.view-btn').on('click',function(){

        $('form').attr('action','/editor-test/')
    })

})
