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

    ]);

    CKEDITOR.replace( 'editor1',{
        stylesSet : 'Bulma_Styles',
        allowedContent : true,
        contentsCss: 'https://cdnjs.cloudflare.com/ajax/libs/bulma/0.7.1/css/bulma.min.css',
        bodyClass : 'content'
    } );

    //TODO: preview area - may need this to move to template
    $('<div class="preview content box">'+ $('#editor1').val() + '</div>').appendTo('body');

    //setting the version in the select box
    $('.version-list select').val($('input[name=currentversion]').val());

    //change version on select
    $('.version-list select').on('change',function(){
        let policyNumber = $('input[name=policynumber]').val();
        let currentVersionNum = $(this).val();
        console.log($(this).val());
        if(policyNumber && currentVersionNum){
            window.location = '/editor-test/'+policyNumber+'/'+currentVersionNum;
        }
    });


    $('button.cancel-btn').on('click',function(){
        let policyNumber = $('input[name=policynumber]').val();
        let currentVersionNum = $('.version-list select > option').length - 1;
        if(policyNumber && currentVersionNum >= 0){
            window.location = '/editor-test/'+policyNumber+'/'+currentVersionNum;
        }else{
            window.location = '/editor-test/';
        }
    });

    $('button.save-btn').on('click',function(){
        let versions = $('.version-list select > option').length;
        if( versions > 0){
            $('input[name=currentversion]').val($('.version-list select > option').length);
        }else{
            $('input[name=currentversion]').val(0)
        }
        $('#policy-form').attr('action','/editor-test/').submit()
    });

    $('button.new-btn').on('click',function(){
        window.location = '/editor-test/';
    });

    $('button.view-btn').on('click',function(){
        window.location = '/policy-list';
    });

    $('button.pub-btn').on('click',function(){
        $.ajax({

            url: 'http://keystone.forgegraphics.com/version-update',
            data: {currentversion: $('input[name=currentversion]').val(),policynumber:$('input[name=policynumber]').val()}
        }).done(function(data){
           console.log(data)
        })
    })

});
