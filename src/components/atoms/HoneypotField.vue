<script setup lang="ts">
// Ловушка для ботов: поле спрятано от людей (за краем экрана, вне порядка Tab, скрыто от экранных дикторов).
// Программы, которые заполняют все поля подряд, заполнят и его — такой запрос сервер молча отбрасывает.
defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="hp" aria-hidden="true">
    <label>Website
      <input
        :value="modelValue" type="text" name="website" tabindex="-1" autocomplete="off"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </label>
  </div>
</template>

<style scoped>
.hp { position:absolute; left:-10000px; top:auto; width:1px; height:1px; overflow:hidden; }
</style>
