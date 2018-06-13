/**
 * Created by praimen on 5/24/2018.
 */

$(function(){

    CKEDITOR.stylesSet.add( 'Bulma_Styles', [
        // Block-level styles
        { name: 'Bulma H1 Title', element: 'h1', attributes: { 'class': 'title is-1' } },
        { name: 'Bulma H2 Title', element: 'h2', attributes: { 'class': 'title is-2' } },
        { name: 'Bulma H3 Title', element: 'h3', attributes: { 'class': 'title is-3' } },
        { name: 'Bulma H1 Sub-Title', element: 'h1', attributes: { 'class': 'subtitle is-1' } },
        { name: 'Bulma H2 Sub-Title', element: 'h2', attributes: { 'class': 'subtitle is-2' } },
        { name: 'Bulma H3 Sub-Title', element: 'h3', attributes: { 'class': 'subtitle is-3' } },

    ] );

    CKEDITOR.editorConfig = function( config ) {
        config.stylesSet = 'Bulma_Styles';
    };

    CKEDITOR.plugins.add( 'editor1', {
        init: function( editor ) {
            editor.addContentsCss( 'https://cdnjs.cloudflare.com/ajax/libs/bulma/0.7.1/css/bulma.min.css' );
        }
    } );
    CKEDITOR.replace( 'editor1' );
    //CKEDITOR.config.contentsCss = 'https://cdnjs.cloudflare.com/ajax/libs/bulma/0.7.1/css/bulma.min.css' ;

    $('<div class="preview content">'+ $('#editor1').val() + '</div>').appendTo('body');

    $('li.content-version').on('click',function(){
        let policyNumber = $('input[name=policynumber]').val();
        let currentVersionNum = $(this).index();
        console.log($(this).index())
        if(policyNumber && currentVersionNum){
            window.location = '/editor-test/'+policyNumber+'/'+currentVersionNum;
        }

    });

    $('button.cancel-btn').on('click',function(){
        let policyNumber = $('input[name=policynumber]').val();
        let currentVersionNum = $('input[name=currentversion]').val();
        if(policyNumber && currentVersionNum){
            window.location = '/editor-test/'+policyNumber+'/'+currentVersionNum;
        }else{
            window.location = '/editor-test/';
        }

    });

    $('button.save-btn').on('click',function(){
        $('input[name=currentversion]').val($('.version-list li').length);
        $('#policy-form').attr('action','/editor-test/').submit()
    });

    $('button.new-btn').on('click',function(){
        window.location = '/editor-test/';
    });

    $('button.view-btn').on('click',function(){
        window.location = '/policy-list';
    })

});
