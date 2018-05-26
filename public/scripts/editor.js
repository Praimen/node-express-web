/**
 * Created by praimen on 5/24/2018.
 */

$(function(){
    CKEDITOR.replace( 'editor1' );

    $('<div class="preview">'+ $('#editor1').val() + '</div>').appendTo('body');

    $('button.cancel-btn').on('click',function(){
        let policyNumber = $('input[name=policynumber]').val()
        window.location('/editor-test/'+policyNumber)

    })

    $('button.save-btn').on('click',function(){
        $('form').attr('action','/editor-test/')
    })

    $('button.new-btn').on('click',function(){
        $('#policy-form').attr('action','/editor-test')
    })

    $('button.view-btn').on('click',function(){

        $('form').attr('action','/editor-test/')
    })

})
