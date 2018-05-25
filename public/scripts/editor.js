/**
 * Created by praimen on 5/24/2018.
 */
CKEDITOR.replace( 'editor1' );

console.log('running')

$('<div class="preview">'+ $('#editor1').val() + '</div>').appendTo('body');