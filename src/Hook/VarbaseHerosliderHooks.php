<?php

declare(strict_types=1);

namespace Drupal\varbase_heroslider\Hook;

use Drupal\Core\Hook\Attribute\Hook;
use Drupal\media\Entity\Media;

/**
 * Hook implementations for the Varbase Hero Slider module.
 */
class VarbaseHerosliderHooks {

  /**
   * Implements hook_preprocess_HOOK() for the varbase_heroslider node.
   */
  #[Hook('preprocess_node__varbase_heroslider')]
  public function preprocessNode(array &$variables): void {
    $node = $variables['elements']['#node'];
    $media = [];
    if ($node->hasField('field_media_single')) {
      $media = $node->get('field_media_single')->getValue();
    }

    if (!empty($media)) {
      $entity = Media::load($media[0]['target_id']);
      $entity_bundle = $entity->bundle();

      if ($entity_bundle == 'remote_video') {
        $variables['provider'] = $entity->field_provider->value;
      }
    }
  }

}
